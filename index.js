import express from 'express'
import path from 'path'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import fs from 'fs'

import { fileURLToPath } from 'url'
import { UserRepository } from './user-repository.js'
import { ServiceRepository } from './service-repository.js'
import { UploadRepository, imageStorageFolder, imageUpload } from './upload-repository.js'
import { SECRET_JWT_KEY, PROFESSION_OPTS, DIRECTION_OPTS, FILTERS } from './config.js'
import multer from 'multer'
import { error } from 'console'

const app = express()
const PORT = process.env.PORT ?? 3000

app.set('view engine', 'ejs')
app.use("/uploads/img", express.static(path.join(dirname(), 'uploads/img')))
app.use(express.static(path.join(dirname(), 'public')))
app.use(express.json()) // allows req.body
app.use(cookieParser())
app.use((req, res, next) => {
    const token = req.cookies.access_token
    req.session = { user: null }

    try {
        const data = jwt.verify(token, SECRET_JWT_KEY)
        req.session.user = data
    } catch (error) {

    }

    next() // -> continue with the following route or middleware
})

function dirname () {
    return path.dirname(fileURLToPath(import.meta.url))
}

app.get('/', (req, res) => {
    const { user } = req.session
    res.render('index', {user:user, FILTERS})
})

app.get('/login', (req, res) => {
    const { user } = req.session
    res.render('auth', {login: true, user, dOpts: DIRECTION_OPTS, pOpts: PROFESSION_OPTS})
})
app.post('/login', async (req, res) => {
    const {email, password} = req.body
    try {
        const user = await UserRepository.login(email, password)
        const {password: _password, ...sUser} = user
        const token = jwt.sign(
            sUser,
            SECRET_JWT_KEY, {
                expiresIn: '1h'
            }
        )
        res
            .cookie('access_token', token, {
                httpOnly: true, //cookie can only be accessed on the server
                // secure: true, //cookie can only be accessed from https
                sameSite: 'strict', //cookie can only be accesed in the same domain
                maxAge: 1000 * 60 * 60 //cookie expires in 1h
            })
            .send(user) //error
    } catch (error) {
        res.status(401).send(JSON.stringify(error.message))
    }

})

app.get('/register', (req, res) => {
    const { user } = req.session
    res.render('auth', {login: false, user, dOpts: DIRECTION_OPTS, pOpts: PROFESSION_OPTS})
})
app.post('/register', async (req, res) => {
    const {email, username, password, name, lastName, direction, profession} = req.body
    try {
        const id = await UserRepository.create(email, username, password, name, lastName, direction, profession)
        res.send({id})
    } catch (error) {
        // not a good idea for security reasons.
        res.status(400).send(JSON.stringify(error.message))
    }
})
app.post('/logout', (req, res) => {
    res.clearCookie('access_token')
    res.sendStatus(200)
})

app.get('/profile', (req, res) => {
    const { user } = req.session
    const profileOf = req.query.username

    const foundUser = profileOf? UserRepository.getUser(profileOf): user
    let details
    let service
    let logoName
    if (foundUser) {
        details = UserRepository.getDetail(foundUser._id)
        const servicePrototype = ServiceRepository.getService(foundUser._id)
        if (typeof servicePrototype !== 'undefined' && servicePrototype !== null) {
            service = servicePrototype
            if (service.serviceImages.logo) {
                const { path } = UploadRepository.getServiceImage(service.serviceImages.logo, 'logo')
                logoName = path.split("/").at(-1)
            }
        }
    }
    res.render('profile',
        user? {user, details, foundUser, service, logoName}:
        {details, foundUser, service, logoName})

})
app.post('/profile', (req, res) => {
    const { user } = req.session
    const { payload } = req.body
    
    if (user) {
        const details = UserRepository.getDetail(user._id)
        if ( payload.type === 'contact-info') {
            details.contactInfo = payload.data
            details.save()
        } else if ( payload.type === 'create-service' ) {
            ServiceRepository.create(user._id, payload.data)
        } else if ( payload.type === 'edit-service' ) {
            const {name, description} = payload.data
            const service = ServiceRepository.getService(user._id)
            
            service.name = name
            service.description = description
            service.save()
        }
    }
    res.sendStatus(200)
})
app.get('/query', (req, res) => {
    const { user } = req.session
    const query = req.query.ask

    res.render('query', {user, query, dOpts: DIRECTION_OPTS, pOpts: PROFESSION_OPTS, FILTERS})
})
app.post('/query/users', (req, res) => {
    res.send([UserRepository.getAllUsers(), UserRepository.getAllDetails()])
})
app.post("/upload", imageUpload.single('data'), (req, res) => {
    const { user } = req.session
    const { type } = req.body

    if (type === 'service-logo' && typeof user !== 'undefined' && user !== null) {
        const image = req.file
        if (typeof image !== 'undefined') {
            const imageId = UploadRepository.uploadServiceImage('logo', image.path)
            //save newly stored image logo to user's service
            const service = ServiceRepository.getService(user._id)
            if (service.serviceImages.logo) {
                const servicePath = UploadRepository.deleteUpload(service.serviceImages.logo)
                console.log(service.serviceImages.logo)
                console.log(servicePath)
                const abspath = path.join(dirname(), servicePath)
                fs.unlink(abspath, err => {
                    if (err) {
                        console.log("error: ",err)
                    } else {
                        console.log("deleted")
                    }
                })
            }
            service.serviceImages.logo = imageId
            service.save()
        }
        res.sendStatus(200)
    }
})


app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`)
})