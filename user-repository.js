import DBLocal from 'db-local'
import crypto from 'crypto'
import bcrypt from 'bcrypt'

import { SALT_ROUNDS } from './config.js'
import { error } from 'console'
import { validateHeaderName } from 'http'
const { Schema } = new DBLocal({path: './db/user'})

const User = Schema('Auth', {
    _id: {type: String, required: true},
    email: {type: String, required: true},
    username: {type: String, required: true},
    password: {type: String, required: true},
    name: {type: String, required: true},
    lastName: {type: String, required: true}
})

const UserDetails = Schema('Details', {
    _id: {type: String, required: true},
    direction: {type: String, required: true},
    profession: {type: String, required: true},
    contactInfo: {type: String, default: 'Sin informacion. Todavia.'}
})

export class UserRepository {
    static async create (email, username, password, name, lastName, direction, profession) {
        Validation.email(email)
        Validation.username(username)
        Validation.password(password)
        Validation.plainText(name)
        Validation.plainText(lastName)
        
        // Ensure email doesn't exist already.
        let user = User.findOne( {email} )
        if (user) throw new Error('Este correo ya esta siendo en uso.') //If these if's are passed then everything is ok.
        user = User.findOne( {username} )
        if (user) throw new Error('Este nombre de usuario ya esta siendo en uso.')
            
        const id = crypto.randomUUID()
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS) //hashSync blocks main thread.
        
        User.create({
            _id: id,
            email: email,
            username: username,
            password: hashedPassword,
            name: name,
            lastName: lastName
        }).save()
        UserDetails.create({
            _id: id,
            direction: direction,
            profession: profession
        }).save()

        return id
    }

    static async login (email, password) {
        Validation.email(email)
        Validation.password(password)

        const user = User.findOne({email})
        const loginError = new Error('Error en el usuario o contraseña')

        if (!user) throw loginError
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) throw loginError

        const {password: _password, ...sUser} = user
        return sUser //this is stored on the cookie so be careful.
    }

    static getAll(safe) {
        return [this.getAllUsers(safe), this.getAllDetails()]
    }

    static getAllUsers(safe) {
        const users = User.find({})
        if (safe) {
            const safeUsers = users.map(({_id, password, ...sUser}) => sUser)
            return safeUsers
        } else {
            return users
        }

    }
    static getAllDetails() {
        return UserDetails.find({})
    }

    static getUser (username) {
        return User.findOne({ username: username })
    }

    static getDetail (_id) {
        return UserDetails.findOne({ _id: _id })
    }

}

class Validation {
    // validate email (optional: zod@gmail.com)
    static email (email) { //all fo this shoud be changed for proper validation
        if (typeof email !== 'string') throw new Error('El correo debe ser texto.')
        if (email.length < 3) throw new Error('El correo tiene que ser almenos 3 caracteres de largo.')
    }
    static username (username) { //all fo this shoud be changed for proper validation
        if (typeof username !== 'string') throw new Error('El nombre de usuario debe ser texto.')
        if (username.length < 3) throw new Error('El nombre de usuario tiene que ser almenos 3 caracteres de largo.')
    }
    static password (password) {
        if (typeof password !== 'string') throw new Error('La contraseña tiene que tener letras.')
        if (password.length < 8) throw new Error('La contraseña tiene que ser almenos 8 caracteres de largo.')
    }
    static plainText (plain) {
        if (typeof plain !== 'string') throw new Error('Incluye letras.')
        if (plain.length < 3) throw new Error('Este campo debe superar los 3 caracteres.')
        // if (plain.match(" ")) throw new Error('Evita espacios.')
    }
}
