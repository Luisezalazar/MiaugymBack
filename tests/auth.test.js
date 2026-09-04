const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')

const { api, startServer, stopServer, createUser, resetDatabase } = require('./helpers')

before(async () => {
    await startServer()
    await resetDatabase()
})

after(async () => {
    await resetDatabase()
    await stopServer()
})

describe('Registro y login', () => {

    test('registra un usuario y devuelve token', async () => {
        const res = await api('/register/createPerson', {
            method: 'POST',
            body: { user: 'alta_ok', password: 'testpass123', email: 'alta_ok@test.local' },
        })
        assert.equal(res.status, 201)
        assert.ok(res.body.token, 'deberia devolver un token')
    })

    test('NUNCA devuelve el hash de la password', async () => {
        // Esta fuga existia en register, login, updatePerson y deletePerson.
        const reg = await api('/register/createPerson', {
            method: 'POST',
            body: { user: 'sin_hash', password: 'testpass123', email: 'sin_hash@test.local' },
        })
        assert.equal(reg.status, 201)
        assert.equal(reg.body.person.password, undefined, 'register filtro el hash')

        const login = await api('/register/login', {
            method: 'POST',
            body: { user: 'sin_hash', password: 'testpass123' },
        })
        assert.equal(login.status, 200)
        assert.equal(login.body.person.password, undefined, 'login filtro el hash')
    })

    test('rechaza la password incorrecta', async () => {
        await api('/register/createPerson', {
            method: 'POST',
            body: { user: 'pass_mala', password: 'testpass123', email: 'pass_mala@test.local' },
        })
        const res = await api('/register/login', {
            method: 'POST',
            body: { user: 'pass_mala', password: 'incorrecta' },
        })
        assert.equal(res.status, 400)
    })

    test('rechaza email duplicado con un mensaje util', async () => {
        const body = { user: 'dup_a', password: 'testpass123', email: 'duplicado@test.local' }
        await api('/register/createPerson', { method: 'POST', body })
        const res = await api('/register/createPerson', {
            method: 'POST',
            body: { ...body, user: 'dup_b' },
        })
        assert.equal(res.status, 400)
        // La clave `error` estaba duplicada en el JSON y pisaba el mensaje.
        assert.ok(res.body.error, 'deberia traer el motivo en `error`')
    })
})

describe('Endpoints protegidos: sin token', () => {

    const protegidos = [
        ['GET', '/person/getPerson/1'],
        ['GET', '/person/getPersonRoutine'],
        ['PUT', '/person/updatePerson/1'],
        ['DELETE', '/person/deletePerson/1'],
        ['GET', '/routine/getRoutine'],
        ['GET', '/routine/getRoutine/1'],
        ['POST', '/routine/createRoutine'],
        ['PUT', '/routine/updateRoutine/1'],
        ['DELETE', '/routine/deleteRoutine/1'],
        ['GET', '/goals/getPersonGoals'],
        ['GET', '/goals/getGoal/1'],
        ['DELETE', '/goals/deleteGoal/1'],
        ['GET', '/routineExercise/getRoutineExercise'],
        ['GET', '/routineExercise/getRoutineExercise/1'],
        ['POST', '/routineExercise/createRoutineExercise'],
        ['PUT', '/routineExercise/updateRoutineExercise/1'],
        ['DELETE', '/routineExercise/deleteRoutineExercise/1'],
    ]

    for (const [method, path] of protegidos) {
        test(`${method} ${path} responde 401`, async () => {
            const res = await api(path, { method })
            assert.equal(res.status, 401, `${method} ${path} quedo accesible sin token`)
        })
    }
})

describe('getPeople fue eliminado', () => {
    test('ya no existe la ruta', async () => {
        const res = await api('/person/getPeople')
        assert.equal(res.status, 404, 'el endpoint que listaba todos los usuarios sigue vivo')
    })
})
