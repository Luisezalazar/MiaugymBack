const express = require('express')
const pkg = require('@prisma/client')
const authMiddleware = require('../middleware/authMiddleware')

//Call functions
const { PrismaClient } = pkg
const router = express.Router();
const prisma = new PrismaClient();

/*
  Un RoutineExercise no tiene dueño propio: pertenece a una Routine, y esa
  Routine tiene personId. Todo el control de acceso de este router pasa por ahi.

  Antes los cinco endpoints estaban ABIERTOS: sin token se podia listar, editar
  o borrar los ejercicios de cualquier usuario.
*/

// Devuelve la rutina si es del usuario del token; si no, null.
const findOwnedRoutine = (routineId, personId) =>
    prisma.routine.findFirst({ where: { id: routineId, personId } })

// Devuelve el ejercicio solo si su rutina es del usuario del token.
const findOwnedExercise = (id, personId) =>
    prisma.routineExercise.findFirst({
        where: { id, Routine: { personId } }
    })

//Post Create
router.post("/createRoutineExercise", authMiddleware, async (req, res) => {
    try {
        const { name, weight, series, repetitions, routineId } = req.body

        /*
          routineId es obligatorio en el esquema pero no se enviaba ni se
          guardaba, asi que este endpoint fallaba SIEMPRE en Prisma. Y como el
          catch solo hacia console.log sin responder, la peticion quedaba
          colgada hasta el timeout del cliente.
        */
        if (!name || !weight || !series || !repetitions || !routineId) {
            return res.status(400).json({ error: "Required fields are missing" })
        }

        const routine = await findOwnedRoutine(parseInt(routineId), req.user.id)
        if (!routine) {
            return res.status(404).json({ error: "Routine not found" })
        }

        // El orden nuevo va al final de la rutina.
        const count = await prisma.routineExercise.count({
            where: { routineId: routine.id }
        })

        const routineExercise = await prisma.routineExercise.create({
            data: {
                name,
                weight,
                series: parseInt(series),
                repetitions,
                routineId: routine.id,
                order: count
            }
        })
        res.status(201).json(routineExercise)
    } catch (error) {
        console.log("Error creating routineExercise", error)
        res.status(500).json({ error: "Error creating routine exercise", detail: error.message })
    }
})

//Get all // Read
router.get("/getRoutineExercise", authMiddleware, async (req, res) => {
    try {
        // Antes devolvia los ejercicios de todos los usuarios.
        const getRoutineExercise = await prisma.routineExercise.findMany({
            where: { Routine: { personId: req.user.id } }
        })
        if (getRoutineExercise.length === 0) { console.log("There is no data") }
        res.json(getRoutineExercise)
    } catch (error) {
        // Antes esta clave `error` duplicada pisaba el mensaje de arriba.
        res.status(500).json({ error: "Error getting data", detail: error.message })
    }
})

//Get by id // Read
router.get("/getRoutineExercise/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const getRoutineExercise = await findOwnedExercise(id, req.user.id)
        if (!getRoutineExercise) { return res.status(404).json({ error: "There is no data" }) }
        res.json(getRoutineExercise)
    } catch (error) {
        res.status(500).json({ error: "Error getting data", detail: error.message })
    }
})

//Update // by id
router.put("/updateRoutineExercise/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, weight, series, repetitions } = req.body

        // Antes era `!name == null || ...`, que siempre da false: la validacion
        // no se disparaba nunca.
        if (!name || !weight || !series || !repetitions) {
            return res.status(400).json({ error: "All fields are required" })
        }

        const owned = await findOwnedExercise(id, req.user.id)
        if (!owned) { return res.status(404).json({ error: "There is no data" }) }

        const updateRoutineExercise = await prisma.routineExercise.update({
            where: { id },
            data: {
                name,
                weight,
                series: parseInt(series),
                repetitions
            }
        })
        res.json(updateRoutineExercise)
    } catch (error) {
        res.status(500).json({ error: "Error updating data", detail: error.message })
    }
})

//Delete by id
router.delete("/deleteRoutineExercise/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id)

        const owned = await findOwnedExercise(id, req.user.id)
        if (!owned) { return res.status(404).json({ error: "There is no data" }) }

        const deleteRoutineExercise = await prisma.routineExercise.delete({
            where: { id }
        })
        res.json(deleteRoutineExercise)
    } catch (error) {
        // Faltaba el return: se enviaban dos respuestas seguidas.
        if (error.code === "P2003") {
            return res.status(409).json({ error: "The exercise is linked to one or more Routines" })
        }
        res.status(500).json({ error: "Error delete Routine exercise", detail: error.message })
    }
})
module.exports = router;
