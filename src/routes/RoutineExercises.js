const express = require('express')
const pkg = require('@prisma/client')

//Call functions
const { PrismaClient } = pkg
const router = express.Router();
const prisma = new PrismaClient();

//Post Create
router.post("/createRoutineExercise", async (req, res) => {
    try {
        const { name, weight, series, repetitions } = req.body
        //Validation
        if (!name || !weight || !series || !repetitions) { return res.status(400).json({ error: "Required fields are missing" }) }
        const routineExercise = await prisma.routineExercise.create({
            data: {
                name,
                weight,
                series,
                repetitions
            }
        })
        res.json(routineExercise)
    } catch (error) {
        console.log("Error creating routineExercise", error)
    }
})

//Get all // Read
router.get("/getRoutineExercise", async (req, res) => {
    try {
        const getRoutineExercise = await prisma.routineExercise.findMany({})
        if (getRoutineExercise.length === 0) { console.log("There is no data") }
        res.json(getRoutineExercise)
    } catch (error) {
        res.status(500).json({ error: "Error getting data",error })
    }
})

//Get by id // Read
router.get("/getRoutineExercise/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const getRoutineExercise = await prisma.routineExercise.findUnique({
            where: { id: id }
        })
        if (!getRoutineExercise) { return res.status(400).json({ error: "There is no data" }) }
        res.json(getRoutineExercise)
    } catch (error) {
        res.status(500).json({ error: "Error getting data",error })
    }
})

//Update // by id
router.put("/updateRoutineExercise/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, weight, series, repetitions } = req.body
        if (!name == null || !weight == null || !series == null || !repetitions == null) {
            return res.status(400).json({ error: "All fields are required" })
        }
        const updateRoutineExercise = await prisma.routineExercise.update({
            where: { id: id },
            data: {
                name,
                weight,
                series,
                repetitions
            }
        })
        res.json(updateRoutineExercise)
    } catch (error) {
        res.status(500).json({ error: "Error updating data" })
    }
})

//Delete by id
router.delete("/deleteRoutineExercise/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const deleteRoutineExercise = await prisma.routineExercise.delete({
            where: { id: id }
        })
        res.json(deleteRoutineExercise)
    } catch (error) {
        if (error.code === "P2003") { res.status(500).json({ error: "The exercise is linked to one or more Routines" }) }
        res.status(500).json({ error: "Error delete Routine exercise" }, error)
    }
})
module.exports = router;