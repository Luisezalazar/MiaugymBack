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

//Update
router.put("/updateGoal/:id", upload.array('images', 5), authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id)
        const { weight, objective, imagesToDelete } = req.body
        const newImagesFiles = req.files || []
        const personId = req.user.id

        if (!weight || !objective) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const result = await prisma.$transaction(async (prisma) => {
            //Delete images
            if (imagesToDelete) {
                const imageIds = JSON.parse(imagesToDelete)
                if (imageIds.length > 0) {
                    const imagesToDeleteDB = await prisma.goalImage.findMany({
                        where: { id: { in: imageIds }, goalId: id }
                    })
                    await prisma.goalImage.deleteMany({
                        where: { id: { in: imageIds }, goalId: id }
                    })

                    for (const image of imagesToDeleteDB) {
                        try {
                            const urlParts = image.url.split('/');
                            const fileWithExtension = urlParts[urlParts.length - 1];
                            const publicId = `miauGym/goals/${fileWithExtension.split('.')[0]}`;
                            await cloudinary.uploader.destroy(publicId);
                        } catch (cloudinaryError) {
                            console.error("Error deleting from Cloudinary:", cloudinaryError);
                        }
                    }
                }
            }

            // Subir nuevas imágenes
            if (newImageFiles.length > 0) {
                const uploadImages = [];
                for (let i = 0; i < newImageFiles.length; i++) {
                    const uploadResult = await cloudinary.uploader.upload(newImageFiles[i].path, {
                        folder: "miauGym/goals"
                    });
                    uploadImages.push({
                        url: uploadResult.secure_url,
                        goalId: id
                    });
                }

                await prisma.goalImage.createMany({ data: uploadImages });
            }

            // Actualizar goal
            const updatedGoal = await prisma.goal.update({
                where: { id },
                data: { weight, objective },
                include: { images: true }
            });
            return updatedGoal;
        })
        res.json(result);



    } catch (error) {
        onsole.error("Error updating goal:", error);
        res.status(500).json({ error: "Error updating goal", details: error });
    }
})


//Delete by id
router.delete("/deleteGoal/:id", authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const goal = await prisma.goal.findUnique({
            where: { id },
            include: { images: true }
        });

        if (!goal) return res.status(404).json({ error: "Goal not found" });

        // Delete images from Cloudinary
        for (const image of goal.images) {
            try {
                const urlParts = image.url.split('/');
                const fileWithExtension = urlParts[urlParts.length - 1];
                const publicId = `miauGym/goals/${fileWithExtension.split('.')[0]}`;
                await cloudinary.uploader.destroy(publicId);
            } catch (cloudinaryError) {
                console.error("Error deleting from Cloudinary:", cloudinaryError);
            }
        }

        // Delete goal (cascades images in DB)
        const deletedGoal = await prisma.goal.delete({
            where: { id }
        });

        res.json(deletedGoal);

    } catch (error) {
        if (error.code === "P2003") return res.status(500).json({ error: "Goal is linked to other objects" });
        res.status(500).json({ error: "Error deleting goal", details: error });
    }
});




module.exports = router;