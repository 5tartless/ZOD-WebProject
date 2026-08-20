export const {
    PORT = 3000,
    SALT_ROUNDS = 1, //Production 10, test 1
    SECRET_JWT_KEY = 'owen-dearson-and-zoe-are-odz-secret',
    PROFESSION_OPTS = ['Programacion', 'Instalacion de software', 'Soporte tecnico', 'Seguridad informatica', 'Herramientas basicas de Office'],
    DIRECTION_OPTS = ['San Jose, Desamparados', 'San Jose, Alajuelita', 'San Jose, Escazu'],
    FILTERS = ['profession', 'direction', 'order']
} = process.env