const express = require('express')
const bcrypt = require('bcrypt')
const pkg = require('@prisma/client')
const authMiddleware = require('../middleware/authMiddleware')
//Call functions
const { PrismaClient } = pkg
const router = express.Router();
const prisma = new PrismaClient();

// Campos publicos de una persona: nunca se devuelve el hash de la password.
const PUBLIC_PERSON = { id: true, user: true, email: true }

/*
  Verifica que el :id de la URL sea el del propio usuario del token.
  Sin esto cualquier usuario logueado podia leer, modificar o borrar la
  cuenta de otro con solo cambiar el numero en la URL.
*/
const ensureSelf = (req, res) => {
    const id = parseInt(req.params.id)
    if (Number.isNaN(id)) {
        res.status(400).json({ error: "Invalid id" })
        return null
    }
    if (id !== req.user.id) {
        res.status(403).json({ error: "You can only manage your own account" })
        return null
    }
    return id
}

// Get by id // Read
router.get("/getPerson/:id", authMiddleware, async (req, res) => {
    try {
        const id = ensureSelf(req, res)
        if (id === null) return

        const getPersonById = await prisma.person.findUnique({
            where: { id },
            select: PUBLIC_PERSON
        })
        if (!getPersonById) { return res.status(404).json({ error: "There is no data" }) }
        res.json(getPersonById)
    } catch (error) {
        res.status(500).json({ error: "Error getting data", detail: error.message })
    }
})

//Get by id The routine of the person
router.get("/getPersonRoutine", authMiddleware, async (req, res) => {
    try {
        const personId = req.user.id
        const getPersonId = await prisma.person.findUnique({
            where: { id: personId },
            include: { Routine: { include: { routineExercise: {
                include: { exercise: { select: { slug: true, primaryMuscle: true, frameCount: true } } },
                orderBy: { order: 'asc' }
            } } } }
        })
        if (!getPersonId) { return res.status(404).json({ message: 'User not found' }) }


        res.json({ routines: getPersonId.Routine })

    } catch (error) {
        res.status(500).json({ error: "The person doesn't have a Routine", detail: error.message })
    }
})

//Update // by id
router.put("/updatePerson/:id", authMiddleware, async (req, res) => {
    try {
        const id = ensureSelf(req, res)
        if (id === null) return

        const { user, password, email } = req.body
        if (!user || !password || !email) {
            return res.status(400).json({ error: "All fields are required" })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const updatePerson = await prisma.person.update({
            where: { id },
            data: {
                user,
                password: hashedPassword,
                email
            },
            select: PUBLIC_PERSON
        })
        res.json(updatePerson)
    } catch (error) {
        res.status(500).json({ error: "Error updating data", detail: error.message })
    }
})

//Delete by id
router.delete("/deletePerson/:id", authMiddleware, async (req, res) => {
    try {
        const id = ensureSelf(req, res)
        if (id === null) return

        const deletePerson = await prisma.person.delete({
            where: { id },
            select: PUBLIC_PERSON
        })
        res.json(deletePerson)
    } catch (error) {
        // Faltaba el return: se enviaba esta respuesta y despues la de abajo,
        // lo que rompia con ERR_HTTP_HEADERS_SENT.
        if (error.code === "P2003") {
            return res.status(409).json({ error: "The person is linked to one or more objects" })
        }
        res.status(500).json({ error: "Error delete person", detail: error.message })
    }
})

module.exports = router;
