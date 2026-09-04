/*
  Verifica el rate limiting real.

  Los limites se fijan ANTES de cargar helpers (que a su vez carga la app),
  porque express-rate-limit los lee al construirse. node --test corre cada
  archivo en un proceso aparte, asi que estos valores bajos no afectan al
  resto de la suite.
*/
process.env.LOGIN_RATE_LIMIT = '3'
process.env.REGISTER_RATE_LIMIT = '2'

const { test, before, after, describe } = require('node:test')
const assert = require('node:assert/strict')

const { api, startServer, stopServer, resetDatabase } = require('./helpers')

before(async () => {
    await startServer()
    await resetDatabase()
})

after(async () => {
    await resetDatabase()
    await stopServer()
})

describe('Rate limiting', () => {

    test('los logins exitosos NO consumen el limite', async () => {
        // skipSuccessfulRequests: un usuario legitimo no queda bloqueado
        // por entrar muchas veces.
        await api('/register/createPerson', {
            method: 'POST',
            body: { user: 'legitimo', password: 'testpass123', email: 'legitimo@test.local' },
        })

        for (let i = 0; i < 6; i++) {
            const res = await api('/register/login', {
                method: 'POST',
                body: { user: 'legitimo', password: 'testpass123' },
            })
            assert.equal(res.status, 200, `el login correcto ${i + 1} fue bloqueado`)
        }
    })

    test('corta la fuerza bruta sobre /login', async () => {
        await api('/register/createPerson', {
            method: 'POST',
            body: { user: 'bruteforce', password: 'testpass123', email: 'bruteforce@test.local' },
        })

        const intento = () => api('/register/login', {
            method: 'POST',
            body: { user: 'bruteforce', password: 'adivinando' },
        })

        // Los primeros intentos fallan por credenciales (400), no por el limite.
        for (let i = 0; i < 3; i++) {
            const res = await intento()
            assert.equal(res.status, 400, `el intento ${i + 1} deberia fallar por password, no por limite`)
        }

        // Pasado el limite, el servidor deja de procesar.
        const bloqueado = await intento()
        assert.equal(bloqueado.status, 429, 'el limitador no corto la fuerza bruta')
        assert.match(bloqueado.body.error, /Too many login attempts/)
    })

    test('limita la creacion masiva de cuentas', async () => {
        const crear = (n) => api('/register/createPerson', {
            method: 'POST',
            body: { user: `masivo_${n}`, password: 'testpass123', email: `masivo_${n}@test.local` },
        })

        // El limite de registro es 2 y ya se consumio con los usuarios de los
        // tests anteriores, asi que aca el corte ya deberia estar activo.
        const res = await crear(1)
        assert.equal(res.status, 429, 'el limitador de registro no corto')
        assert.match(res.body.error, /Too many accounts created/)
    })
})
