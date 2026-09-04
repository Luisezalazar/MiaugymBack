/*
  Aislamiento entre usuarios.

  Cada test crea DOS usuarios reales: una victima con datos propios y un
  atacante. Todos los intentos del atacante sobre recursos ajenos deben
  fallar, y el dueño debe seguir pudiendo operar sobre los suyos (para que
  el arreglo no se convierta en un bloqueo de todo).
*/
const { test, before, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert/strict')

const { api, startServer, stopServer, createUser, resetDatabase } = require('./helpers')

let victima
let atacante
let rutinaId
let goalId

before(async () => {
    await startServer()
})

after(async () => {
    await resetDatabase()
    await stopServer()
})

beforeEach(async () => {
    await resetDatabase()

    victima = await createUser('victima')
    atacante = await createUser('atacante')

    const rutina = await api('/routine/createRoutine', {
        method: 'POST',
        token: victima.token,
        body: {
            name: 'Rutina de la victima',
            duration: 60,
            routineExercise: [
                { name: 'Press banca', weight: '60', series: '4', repetitions: '8-10' },
            ],
        },
    })
    rutinaId = rutina.body.id

    const goal = await api('/goals/createGoal', {
        method: 'POST',
        token: victima.token,
        body: { weight: '82', objective: 'Bajar a 78kg' },
    })
    goalId = goal.body.goal.id
})

describe('Cuentas', () => {

    test('el atacante NO puede leer la cuenta ajena', async () => {
        const res = await api(`/person/getPerson/${victima.id}`, { token: atacante.token })
        assert.equal(res.status, 403)
    })

    test('el atacante NO puede cambiar la password ajena', async () => {
        const res = await api(`/person/updatePerson/${victima.id}`, {
            method: 'PUT',
            token: atacante.token,
            body: { user: 'hackeado', password: 'nueva123', email: 'hack@test.local' },
        })
        assert.equal(res.status, 403)

        // La victima sigue entrando con su password original.
        const login = await api('/register/login', {
            method: 'POST',
            body: { user: victima.user, password: 'testpass123' },
        })
        assert.equal(login.status, 200, 'la password de la victima fue alterada')
    })

    test('el atacante NO puede borrar la cuenta ajena', async () => {
        const res = await api(`/person/deletePerson/${victima.id}`, {
            method: 'DELETE',
            token: atacante.token,
        })
        assert.equal(res.status, 403)
    })

    test('el dueño SI puede leer su propia cuenta', async () => {
        const res = await api(`/person/getPerson/${victima.id}`, { token: victima.token })
        assert.equal(res.status, 200)
        assert.equal(res.body.password, undefined)
    })
})

describe('Rutinas', () => {

    test('el atacante NO ve la rutina ajena por id', async () => {
        const res = await api(`/routine/getRoutine/${rutinaId}`, { token: atacante.token })
        assert.equal(res.status, 404)
    })

    test('el listado solo trae las rutinas propias', async () => {
        const delAtacante = await api('/routine/getRoutine', { token: atacante.token })
        assert.equal(delAtacante.status, 200)
        assert.equal(delAtacante.body.length, 0, 'el atacante vio rutinas ajenas')

        const deLaVictima = await api('/routine/getRoutine', { token: victima.token })
        assert.equal(deLaVictima.body.length, 1)
    })

    test('el atacante NO puede editar ni apropiarse de la rutina ajena', async () => {
        const res = await api(`/routine/updateRoutine/${rutinaId}`, {
            method: 'PUT',
            token: atacante.token,
            body: { name: 'robada', duration: 30, routineExercise: [] },
        })
        assert.equal(res.status, 404)

        // Sigue perteneciendo a la victima y con su nombre original.
        const check = await api(`/routine/getRoutine/${rutinaId}`, { token: victima.token })
        assert.equal(check.body.name, 'Rutina de la victima')
        assert.equal(check.body.personId, victima.id, 'la rutina cambio de dueño')
    })

    test('el atacante NO puede borrar la rutina ajena', async () => {
        const res = await api(`/routine/deleteRoutine/${rutinaId}`, {
            method: 'DELETE',
            token: atacante.token,
        })
        assert.equal(res.status, 404)

        const check = await api(`/routine/getRoutine/${rutinaId}`, { token: victima.token })
        assert.equal(check.status, 200, 'la rutina fue borrada por un tercero')
    })

    test('el dueño SI puede editar su rutina', async () => {
        const res = await api(`/routine/updateRoutine/${rutinaId}`, {
            method: 'PUT',
            token: victima.token,
            body: { name: 'Renombrada', duration: 90, routineExercise: [] },
        })
        assert.equal(res.status, 200)
        assert.equal(res.body.name, 'Renombrada')
    })

    test('acepta series y duration como texto, que es lo que manda el formulario', async () => {
        /*
          Regresion: el esquema pide Int y los inputs type="number" devuelven
          string. createRoutine hacia parseInt pero updateRoutine no, asi que
          editar una rutina fallaba con 500 apenas se tocaba el campo Series.
        */
        const res = await api(`/routine/updateRoutine/${rutinaId}`, {
            method: 'PUT',
            token: victima.token,
            body: {
                name: 'Con texto',
                duration: '90',
                routineExercise: [
                    { name: 'Press banca', weight: '70', series: '5', repetitions: '8' },
                ],
            },
        })
        assert.equal(res.status, 200, 'editar con valores de texto deberia funcionar')
        assert.equal(res.body.duration, 90)
        assert.equal(res.body.routineExercise[0].series, 5)
        assert.equal(typeof res.body.routineExercise[0].series, 'number')
    })
})

describe('Objetivos de peso', () => {

    test('el atacante NO lee el objetivo ajeno', async () => {
        const res = await api(`/goals/getGoal/${goalId}`, { token: atacante.token })
        assert.equal(res.status, 404)
    })

    test('el atacante NO edita el objetivo ajeno', async () => {
        const res = await api(`/goals/updateGoal/${goalId}`, {
            method: 'PUT',
            token: atacante.token,
            body: { weight: '50', objective: 'alterado' },
        })
        assert.notEqual(res.status, 200, 'el atacante pudo editar un objetivo ajeno')
    })

    test('el atacante NO borra el objetivo ajeno', async () => {
        const res = await api(`/goals/deleteGoal/${goalId}`, {
            method: 'DELETE',
            token: atacante.token,
        })
        assert.equal(res.status, 404)

        const check = await api('/goals/getPersonGoals', { token: victima.token })
        assert.equal(check.body.length, 1, 'el objetivo fue borrado por un tercero')
    })

    test('el listado solo trae los objetivos propios', async () => {
        const res = await api('/goals/getPersonGoals', { token: atacante.token })
        assert.equal(res.status, 200)
        assert.equal(res.body.length, 0)
    })
})

describe('Ejercicios de rutina', () => {

    test('el listado solo trae los ejercicios de rutinas propias', async () => {
        const delAtacante = await api('/routineExercise/getRoutineExercise', { token: atacante.token })
        assert.equal(delAtacante.body.length, 0, 'el atacante vio ejercicios ajenos')

        const deLaVictima = await api('/routineExercise/getRoutineExercise', { token: victima.token })
        assert.equal(deLaVictima.body.length, 1)
    })

    test('el atacante NO puede agregar ejercicios a una rutina ajena', async () => {
        const res = await api('/routineExercise/createRoutineExercise', {
            method: 'POST',
            token: atacante.token,
            body: { name: 'inyectado', weight: '10', series: '3', repetitions: '10', routineId: rutinaId },
        })
        assert.equal(res.status, 404)
    })

    test('el dueño SI puede agregar un ejercicio a su rutina', async () => {
        // Antes este endpoint fallaba siempre: no guardaba routineId, que es
        // obligatorio, y el catch no respondia (la peticion quedaba colgada).
        const res = await api('/routineExercise/createRoutineExercise', {
            method: 'POST',
            token: victima.token,
            body: { name: 'Fondos', weight: 'corporal', series: '3', repetitions: '12', routineId: rutinaId },
        })
        assert.equal(res.status, 201)
        assert.equal(res.body.routineId, rutinaId)
        assert.equal(res.body.order, 1, 'deberia quedar al final de la rutina')
    })
})
