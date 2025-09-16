const express = require('express')
const pkg = require('@prisma/client')

// Call functions
const { PrismaClient } = pkg
const router = express.Router();
const prisma = new PrismaClient();

// Post // Create
router.post("/createRoutine", async (req, res) => {
    console.log(req.body)
    try {
        const { name, personId, routineExercise } = req.body

        const findPerson = parseInt(personId)

        //The person exists?
        const person = await prisma.person.findUnique({
            where: { id: findPerson }
        })
        if (!person) { res.status(404).json({ error: "Person not found",error }) }

        //Create routine
        const routine = await prisma.routine.create({
            data: {
                name: name,
                person: { connect: { id: findPerson } },
                routineExercise: {
                    create: routineExercise.map((e) => ({
                        name: e.name,
                        weight: e.weight,
                        series: e.series,
                        repetitions: e.repetitions
                    })),
                },
            },
            include: { routineExercise: true, person: true }
        })
        res.json(routine)
        console.log("esito")
    } catch (error) {
        console.log("Error creating routine: ", error)
    }

})

//Get all //  Read
router.get("/getRoutine", async (req, res) => {
    try {
        const getRoutine = await prisma.routine.findMany({ include: { routineExercise: true } });
        if (getRoutine.length === 0) { console.log('There is no data',error) }
        res.json(getRoutine)

    } catch (error) {
        res.status(500).json({ error: "Error getting data",error })
    }
})

//Get by id // Read
router.get("/getRoutine/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const getRoutineId = await prisma.routine.findUnique({
            where: {
                id: id,
            },
            include:{routineExercise:true}
        })
        if (!getRoutineId) { res.status(404).json({ error: "There is no data" }) }
        res.json(getRoutineId)

    } catch (error) {
        res.status(500).json({error:"Error getting data",error})
    }
})


module.exports = router

