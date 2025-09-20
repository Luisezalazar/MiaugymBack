const express = require('express')
const pkg = require('@prisma/client')
const authMiddleware = require('../middleware/authMiddleware')
//Call functions
const { PrismaClient } = pkg
const router = express.Router();
const prisma = new PrismaClient();

//Get all // Read
router.get("/getPeople", async (req, res) => {
    try {
        const getPeople = await prisma.person.findMany({})
        if (getPeople.length === 0) { console.log("There is no data") }
        res.json(getPeople)
    } catch (error) {
        res.status(500).json({ error: "Error getting data", error })
    }
})
// Get by id // Read
router.get("/getPerson/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const getPersonById = await prisma.person.findUnique({
            where: { id: id }
        })
        if (!getPersonById) { return res.status(404).json({ error: "There is no data" }) }
        res.json(getPersonById)
    } catch (error) {
        res.status(500).json({ error: "Error getting data", error })
    }
})

//Get by id The routine of the person 
router.get("/getPersonRoutine", authMiddleware, async (req, res) => {
    try {
        const personId = req.user.id
        const getPersonId = await prisma.person.findUnique({
            where: { id: personId },
            include: { Routine: { include: { routineExercise:true }} }
        })
        if (!getPersonId) { return res.status(404).json({ message: 'User not found' }) }
        
        
        res.json({ routines: getPersonId.Routine })

    } catch (error) {
        res.status(500).json({ error: "The person doesn't have a Routine", error })
    }
})

//Update // by id
router.put("/updatePerson/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { user, password, email } = req.body
        if (!user == null || !password == null || !email == null) {
            return res.status(400).json({ error: "All fields are required", error })
        }
        const updatePerson = await prisma.person.update({
            where: { id: id },
            data: {
                user,
                password,
                email
            }
        })
        res.json(updatePerson)
    } catch (error) {
        res.status(500).json({ error: "Error updating data", error })
    }
})

//Delete by id
router.delete("/deletePerson/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const deletePerson = await prisma.person.delete({
            where: { id: id }
        })
        res.json(deletePerson)
    } catch (error) {
        if (error.code === "P2003") { res.status(500).json({ error: "The person is linked to one or more objects" }) }
        res.status(500).json({ error: "Error delete person", error })
    }
})

module.exports = router;