import DBLocal from 'db-local'
import crypto from 'crypto'

import { error } from 'console'
import { validateHeaderName } from 'http'
const { Schema } = new DBLocal({path: './db/service'})

const Service = Schema('Services', {
    _id: {type: String, required: true},
    type: {type: String, required: true},
    name: {type: String, required: true},
    description: {type: String, required: true},
    _userId: {type: String, default: ""},
    serviceImages: {type: Object, default: {
        logo: '',
        images: []
    }}
})

export class ServiceRepository {
    static create (userId, serviceInfo) {
        const {type, name, description} = serviceInfo
        //validate
        Validation.name(name)
        Validation.description(description)

        const id = crypto.randomUUID()
        const serviceData = {
            _id: id,
            type,
            name,
            description
        }
        if (typeof userId !== 'undefined') {
            serviceData._userId = userId
        }

        Service.create(serviceData).save()

        return id
    }

    static asignTo (id, userId) {
        const serviceFound = Service.findOne({ _id: id })
        if (serviceFound._userId === "") {
            serviceFound._userId = userId
        } else {
            throw new Error("Este servicio ya esta asignado.")
        }

        serviceFound.save()
    }

    static getService (userId) {
        return Service.findOne({_userId: userId})
    }

    static getAllServices() {
        return Service.find({})
    }
}

class Validation {
    static name (name) { //all fo this shoud be changed for proper validation
        if (typeof name !== 'string') throw new Error('El nombre debe ser texto.')
        if (name.length < 3) throw new Error('El nombre tiene que ser almenos 3 caracteres de largo.')
    }
    static description (description) {
        if (typeof description !== 'string') throw new Error('La descripcion debe ser texto.')
        if (description.length < 3) throw new Error('La descripcion tiene que ser almenos 3 caracteres de largo.')
    } 
}
