/*
  Utilidades comunes a los tests de integracion.

  IMPORTANTE: apunta la conexion a la base de TEST antes de cargar la app.
  dotenv no pisa variables ya definidas, asi que al setear DATABASE_URL aca
  arriba el .env no la sobreescribe y los tests nunca tocan tus datos de
  desarrollo.
*/
// dotenv primero: sin esto TEST_DATABASE_URL todavia no existe cuando se valida.
require('dotenv').config({ quiet: true })

/*
  La URL no tiene valor por defecto a proposito: poner una credencial real en el
  codigo la publicaria, porque este repositorio es publico. Se define en
  Back/.env, que si esta ignorado por git. Ver Back/.env.template.
*/
if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
        'Falta TEST_DATABASE_URL en Back/.env. Debe apuntar a una base de test aparte. Ver Back/.env.template.'
    )
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL

// JWT_SECRET propio por si el .env no estuviera presente en el entorno de CI.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-for-production'

/*
  La suite crea decenas de usuarios y hace muchos logins, asi que el rate
  limiter real la bloquearia. Se sube el limite salvo que el propio test lo
  haya fijado antes (asi ratelimit.test.js puede probar el limitador de verdad).
  node --test corre cada archivo en su propio proceso, por eso no se pisan.
*/
process.env.LOGIN_RATE_LIMIT = process.env.LOGIN_RATE_LIMIT || '100000'
process.env.REGISTER_RATE_LIMIT = process.env.REGISTER_RATE_LIMIT || '100000'

const app = require('../src/app')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

let server
let baseUrl

/** Levanta la app en un puerto libre elegido por el sistema (port 0). */
const startServer = () =>
    new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}/api`
            resolve(baseUrl)
        })
    })

const stopServer = async () => {
    await prisma.$disconnect()
    if (server) await new Promise((resolve) => server.close(resolve))
}

/** fetch contra la API, con token opcional. Devuelve { status, body }. */
const api = async (path, { method = 'GET', token, body } = {}) => {
    const res = await fetch(baseUrl + path, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const text = await res.text()
    let parsed
    try { parsed = JSON.parse(text) } catch { parsed = text }
    return { status: res.status, body: parsed }
}

/**
 * Crea un usuario con nombre unico y devuelve { token, id, user }.
 * El sufijo aleatorio evita choques entre corridas y entre tests paralelos.
 */
const createUser = async (label) => {
    const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`
    const user = `${label}_${suffix}`
    const res = await api('/register/createPerson', {
        method: 'POST',
        body: { user, password: 'testpass123', email: `${user}@test.local` },
    })
    if (res.status !== 201) {
        throw new Error(`No se pudo crear el usuario de prueba: ${JSON.stringify(res.body)}`)
    }
    return { token: res.body.token, id: res.body.person.id, user }
}

/** Deja la base de test vacia. Solo se usa contra miaugym_test. */
const resetDatabase = async () => {
    if (!process.env.DATABASE_URL.includes('miaugym_test')) {
        throw new Error('resetDatabase solo puede correr contra la base de test')
    }
    await prisma.goalImage.deleteMany()
    await prisma.goal.deleteMany()
    await prisma.routineExercise.deleteMany()
    await prisma.routine.deleteMany()
    await prisma.person.deleteMany()
}

module.exports = { api, startServer, stopServer, createUser, resetDatabase, prisma }
