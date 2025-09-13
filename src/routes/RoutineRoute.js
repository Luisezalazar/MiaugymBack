const express = require('express')
const pkg = require('@prisma/client')

// Call functions
const { PrismaClient } = pkg
const router = express.Router();
const prisma = new PrismaClient();

// Post // Create
router.post("/createRoutine", async (req, res) => {
    try {
        const { person, name, RoutineExercise } = req.body
        const personId = parseInt(person)

        const routine = await prisma.routine.create({
            data: { name, person: { connect: { id: personId } } }
        })

        const exercises = await Promise.all(
            RoutineExercise.map(async (exercises)=>{
                const exercisesId = parseInt(exercises.id)
                const findExercise = await prisma.exercise.findUnique({
                    where:{id:(exercisesId)}
                })
                //Validation
                if(!findExercise){res.status(500).json({error: "The exercise was not found"})}

                return await prisma.routineExercise.create({
                    data:{
                        name,
                        weight,
                        series,
                        repetitions
                    }
                })
            })
        )

        //Update 
    } catch (error) {
    
    }
})


module.exports = router