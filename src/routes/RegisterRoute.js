const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const express = require('express')
const pkg = require('@prisma/client')

const { PrismaClient } = pkg
const router = express.Router()
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET

//Register
router.post("/createPerson", async (req, res) => {
    const { user, password, email } = req.body
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const person = await prisma.person.create({
            data: { user, password: hashedPassword, email }
        });

        //Create JWT
        const token = jwt.sign(
            { id: person.id, user: person.user },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            message: 'User created successfuly',
            token,
            person
        })
    } catch (error) {
        res.status(400).json({ error: "Email already exists", error })
    }
})

//Login
router.post("/login", async (req, res) => {
    try {
        const { user, password } = req.body
        if (!user || !password) { return res.status(400).json({ error: 'User and password required' }) }

        const person = await prisma.person.findUnique({ where: { user } })
        if (!person) return res.status(400).json({ error: "User not found" })

        const validPassword = await bcrypt.compare(password, person.password)
        if (!validPassword) return res.status(400).json({ error: "Invalid user or password" })

        //Create JWT
        const token = jwt.sign(
            { id: person.id, user: person.user },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: 'Login successfuly',
            token,
            person
        })

    } catch (error) {
        res.status(500).json({ error: "Something went wrong", error })
    }
})


router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'No token provided' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        res.json({ success: true, user: decoded })
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' })
    }
})



module.exports = router;

