import multer from 'multer'
import path from 'path'
import DBLocal from 'db-local'
import crypto from 'crypto'

const { Schema } = new DBLocal({path: './db/uploads'})


export const imageStorageFolder = 'uploads/img'
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imageStorageFolder)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})
const imageFileFilter = (req, file, cb) => {
    const allowedImgTypes = /jpeg|jpg|png/
    const isExtensionValid = allowedImgTypes.test(path.extname(file.originalname))
    const isMimeValid = allowedImgTypes.test(file.mimetype)

    if (isExtensionValid && isMimeValid) {
        return cb(null, true)
    }
    cb(new Error('Formato invalido de imagen. Por favor usa: (jpeg, jpg, png).'))
}
export const imageUpload = multer({
    storage: imageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
})
const ServiceImage = Schema('ServiceImages', {
    _id: {type: String, required: true},
    type: {type: String, required: true},
    path: {type: String, required: true}
})

export class UploadRepository {
    static uploadServiceImage(type, path) {
        //no validation needed, imageFileFilter already worked on it.
        const id = crypto.randomUUID()
        ServiceImage.create({
            _id: id,
            type,
            path
        }).save()

        return id
    }
    static getServiceImage(id, type) {
        return ServiceImage.findOne({_id: id, type})
    }

    static deleteUpload(id) {
        const { path } = ServiceImage.findOne({ _id: id })
        ServiceImage.remove({ _id: id })
        return path
    }
}
