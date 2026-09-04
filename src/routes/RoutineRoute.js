const express = require('express')
const pkg = require('@prisma/client')
const authMiddleware = require('../middleware/authMiddleware')

// Call functions
const { PrismaClient } = pkg
const router = express.Router();
const prisma = new PrismaClient();

// Post // Create
router.post("/createRoutine", authMiddleware, async (req, res) => {
    console.log(req.body)
    try {
        const { name, routineExercise, duration } = req.body

        const personId = req.user.id

        //Create routine
        const routine = await prisma.routine.create({
            data: {
                name: name,
                person: { connect: { id: personId } },
                duration: duration,
                routineExercise: {
                    create: routineExercise.map((e, index) => ({
                        name: e.name,
                        weight: e.weight,
                        series: parseInt(e.series),
                        repetitions: e.repetitions,
                        order: index,
                        // Vinculo opcional al catalogo: null si el nombre se
                        // escribio a mano en vez de elegirse de la lista.
                        exerciseId: e.exerciseId ? parseInt(e.exerciseId) : null
                    })),
                },
            },
            include: { routineExercise: {
                include: { exercise: { select: { slug: true, primaryMuscle: true, frameCount: true } } },
                orderBy: { order: 'asc' }
            }, person: { select: { id: true, user: true, email: true } } }
        })
        res.json(routine)
        console.log("Successfully")
    } catch (error) {
        console.log("Error creating routine: ", error)
    }

})

//Get all //  Read
// Antes estaba abierto y devolvia las rutinas de TODOS los usuarios.
// Ahora requiere token y solo lista las del propio usuario.
router.get("/getRoutine", authMiddleware, async (req, res) => {
    try {
        const getRoutine = await prisma.routine.findMany({
            where: { personId: req.user.id },
            include: { routineExercise: {
                include: { exercise: { select: { slug: true, primaryMuscle: true, frameCount: true } } },
                orderBy: { order: 'asc' }
            } }
        });
        // Antes aqui se logueaba `error`, que no existe en este scope.
        if (getRoutine.length === 0) { console.log('There is no data') }
        res.json(getRoutine)

    } catch (error) {
        res.status(500).json({ error: "Error getting data", detail: error.message })
    }
})

//Get by id // Read
router.get("/getRoutine/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        // findFirst con personId: si la rutina es de otro usuario, no aparece.
        const getRoutineId = await prisma.routine.findFirst({
            where: { id, personId: req.user.id },
            include: { routineExercise: {
                include: { exercise: { select: { slug: true, primaryMuscle: true, frameCount: true } } },
                orderBy: { order: 'asc' }
            } }
        })
        // Faltaba el return: se mandaba el 404 y despues el json, rompiendo
        // con ERR_HTTP_HEADERS_SENT.
        if (!getRoutineId) { return res.status(404).json({ error: "There is no data" }) }
        res.json(getRoutineId)

    } catch (error) {
        res.status(500).json({ error: "Error getting data", detail: error.message })
    }
})

//Update
router.put("/updateRoutine/:id", authMiddleware, async (req, res) => {
    try {
        const { name, routineExercise, duration } = req.body
        const personId = req.user.id
        const routineId = parseInt(req.params.id)

        /*
          Control de propiedad. Antes el update apuntaba solo a { id: routineId }
          y ademas hacia `person: { connect: { id: personId } }`, asi que
          cualquier usuario logueado podia editar la rutina de otro Y quedarsela.
        */
        const owned = await prisma.routine.findFirst({
            where: { id: routineId, personId }
        })
        if (!owned) {
            return res.status(404).json({ error: "Routine not found" })
        }

        const updateRoutine = await prisma.routine.update({
            where: { id: routineId },
            data: {
                name,
                duration: duration != null && duration !== '' ? parseInt(duration) : null,
                routineExercise: {
                    deleteMany: {},
                    upsert: routineExercise.map((e, index) => ({
                        where: { id: e.id || 0 },
                        update: {
                            name: e.name,
                            weight: e.weight,
                            // El esquema pide Int y los inputs type="number"
                            // devuelven string: sin parseInt, Prisma rechaza el
                            // update apenas se toca el campo Series.
                            series: parseInt(e.series),
                            repetitions: e.repetitions,
                            order: index,
                            exerciseId: e.exerciseId ? parseInt(e.exerciseId) : null
                        },
                        create: {
                            name: e.name,
                            weight: e.weight,
                            series: parseInt(e.series),
                            repetitions: e.repetitions,
                            order: index,
                            exerciseId: e.exerciseId ? parseInt(e.exerciseId) : null
                        }
                    }))
                }
            },
            include: { routineExercise: {
                include: { exercise: { select: { slug: true, primaryMuscle: true, frameCount: true } } },
                orderBy: { order: 'asc' }
            }, person: { select: { id: true, user: true, email: true } } },
        })
        res.json(updateRoutine)

    } catch (error) {
        console.error("Error updating routine: ", error)
        res.status(500).json({ error: "Error updating routine", detail: error.message })
    }
})

//Delete Routine with Exercises
router.delete("/deleteRoutine/:id", authMiddleware, async (req, res) => {
    try {
        const routineId = parseInt(req.params.id)
        const personId = req.user.id

        const routine = await prisma.routine.findFirst({
            where: { id: routineId, personId }
        })

        if (!routine) {
            return res.status(404).json({ error: "Routine not found" })
        }

        const deletedRoutine = await prisma.routine.delete({
            where: { id: routineId }
        })
        res.json({ message: "Routine and its exercises deleted successfully", routine: deletedRoutine })

    } catch (error) {
        console.error("Error deleting routine: ", error)
        res.status(500).json({ error: "Error deleting routine" })
    }
})



module.exports = router

