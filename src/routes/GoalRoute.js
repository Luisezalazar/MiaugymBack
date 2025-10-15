const express = require('express')
const pkg = require('@prisma/client')
const cloudinary = require('cloudinary').v2
const authMiddleware = require('../middleware/authMiddleware')

const upload = require('../cloudinaryUploader')

//Call functions
const { PrismaClient } = pkg
const router = express.Router();
const prisma = new PrismaClient();

//Post //Create
router.post("/createGoal", upload.array('images', 5), authMiddleware, async (req, res) => {
    try {
        const { weight, objective } = req.body
        const imageFiles = req.files
        const personId = req.user.id
        if (!weight || !objective) {
            return res.status(400).json({ error: "All fields are required" })
        }

        //Create Goal
        const goal = await prisma.goal.create({
            data: {
                weight,
                objective,
                person: { connect: { id: personId } },
            },
        })

        //Create images Cloudinary
        const uploadImages = []
        for (let i = 0; i < imageFiles.length; i++) {
            const img = imageFiles[i]
            const uploadResult = await cloudinary.uploader.upload(img.path, {
                folder: "miauGym/goals"
            })
            uploadImages.push({
                url: uploadResult.secure_url,
                goalId: goal.id
            })
        }
        //Create record from saved images
        if (uploadImages.length > 0) {
            await prisma.goalImage.createMany({ data: uploadImages })
        }
        //Send response
        return res.status(201).json({
            message: "Goal created",
            goal: {
                ...goal,
                images: uploadImages,
            },
        });

    } catch (error) {
        console.error("Error create goal", error)
        return res.status(500).json({ error: "Error create goal" })
    }
})

//Get all record with the person // Read

router.get("/getPersonGoals", authMiddleware, async (req, res) => {
    try {
        const personId = req.user.id
        const getPersonGoals = await prisma.person.findUnique({
            where: { id: personId },
            include: { goals: { include: { images: true } } }
        })
        if (!getPersonGoals) { return res.status(404).json({ message: 'User not found' }) }
        res.json(getPersonGoals.goals)
    } catch (error) {
        res.status(500).json({ error: "Error getting data", error })
    }
})


//Get by id
router.get("/getGoal/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const getGoalsById = await prisma.goal.findUnique({
            where: { id: id },
            include: {
                images: true,
            }
        })
        if (!getGoalsById) { return res.status(404).json({ error: "There is no data" }) }
        res.json(getGoalsById)
    } catch (error) {
        res.status(500).json({ error: "Error getting data", error })
    }
})

//Delete by id
router.delete("/deleteGoal/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const deleteGoal = await prisma.goal.delete({
            where: { id: id }
        })
        res.json(deleteGoal)

    } catch (error) {
        if (error.code === "P2003") { res.status(500).json({ error: "The Goal is linked to one or more objects" }) }
        res.status(500).json({ error: "Error delete Goal", error })
    }
})




module.exports = router;