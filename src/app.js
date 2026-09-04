require("dotenv").config()

const express = require("express")
const cors = require('cors')
const { rateLimit } = require('express-rate-limit')
const RoutineRoute = require("./routes/RoutineRoute")
const Person = require('./routes/PersonRoute')
const Register = require('./routes/RegisterRoute')
const routineExercise = require('./routes/RoutineExercises')
const Goals = require('./routes/GoalRoute')
const Exercises = require('./routes/ExerciseRoute')

const app = express();

/*
  Detras de un proxy (Render, Vercel, Nginx) todas las peticiones llegan con la
  IP del proxy. Sin esto, el rate limiter contaria a TODOS los usuarios como uno
  solo y el primero que fallara 10 logins dejaria afuera al resto.

  No se activa por defecto porque mal puesto es peor que no tenerlo: si se
  confia en mas saltos de los que hay, cualquiera puede falsear la cabecera
  X-Forwarded-For y saltarse el limite. En Render el valor correcto es 1.
*/
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', Number(process.env.TRUST_PROXY))
}

/*
  Origenes permitidos. Antes era un unico string fijo en 'http://localhost:5173',
  asi que cualquier variacion rompia todas las llamadas con un error de CORS
  opaco: Vite cayendo al 5174 porque el 5173 estaba ocupado, o abrir la app por
  127.0.0.1 en vez de localhost.

  Se pueden agregar mas (por ejemplo el front de produccion) con la variable
  CORS_ORIGINS en el .env, separados por coma.
*/
const DEFAULT_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',   // vite preview
]

const allowedOrigins = [
    ...DEFAULT_ORIGINS,
    ...(process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
]

const corsOptions = {
    origin: (origin, callback) => {
        // Sin cabecera Origin: curl, Postman o same-origin. Se permite.
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error(`Origen no permitido por CORS: ${origin}`))
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions))

app.use(express.json());

/*
  Rate limiting sobre los endpoints de autenticacion. Sin esto, /login admitia
  intentos ilimitados: fuerza bruta sobre cualquier cuenta sin ninguna traba.

  skipSuccessfulRequests: solo se cuentan los intentos FALLIDOS, asi un usuario
  legitimo que entra bien nunca queda bloqueado.

  Nota para cuando lo despliegues: detras de un proxy (Vercel, Render, Nginx)
  todas las peticiones llegan con la IP del proxy y el limite se compartiria
  entre todos. Ahi hay que configurar app.set('trust proxy', 1). No lo dejo
  activado porque, mal puesto, permite falsear la IP y saltarse el limite.
*/
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutos
    // Configurable para que la suite de tests no se autobloquee.
    limit: Number(process.env.LOGIN_RATE_LIMIT) || 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Try again in a few minutes.' },
})

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,   // 1 hora
    limit: Number(process.env.REGISTER_RATE_LIMIT) || 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many accounts created. Try again later.' },
})

app.use('/api/register/login', loginLimiter)
app.use('/api/register/createPerson', registerLimiter)

// Chequeo rapido de que el back esta vivo y con la base conectada
app.get('/api/health', async (req, res) => {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    try {
        await prisma.$queryRaw`SELECT 1`
        res.json({ status: 'ok', database: 'connected' })
    } catch (error) {
        res.status(503).json({ status: 'degraded', database: 'unreachable', detail: error.message })
    } finally {
        await prisma.$disconnect()
    }
})

app.use('/api/register', Register)
app.use('/api/Routine', RoutineRoute)
app.use('/api/person', Person)
app.use('/api/routineExercise', routineExercise)
app.use('/api/goals', Goals)
app.use('/api/exercise', Exercises)

/*
  Solo se levanta el servidor si el archivo se ejecuta directamente.
  Al importarlo (por ejemplo desde los tests) se obtiene la app sin abrir
  el puerto, que asi lo elige el propio test.
*/
if (require.main === module) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Active in ${port}`)
        console.log(`CORS permitido para: ${allowedOrigins.join(', ')}`)
        console.log(`trust proxy: ${process.env.TRUST_PROXY || 'desactivado (desarrollo local)'}`)
    })
}

module.exports = app