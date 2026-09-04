const express = require('express')
const pkg = require('@prisma/client')
const authMiddleware = require('../middleware/authMiddleware')

const { PrismaClient } = pkg
const router = express.Router();
const prisma = new PrismaClient();

/*
  Catalogo de ejercicios (workout-guide, CC BY-SA 4.0).

  Es un catalogo comun, no datos de usuario: no hay nada que acotar por dueño,
  pero igual pide token para no dejar endpoints abiertos por defecto.
*/

// Campos que necesita el front. frameCount y slug alcanzan para armar
// las URLs de las 3 imagenes sin guardarlas en la base.
const CATALOG_FIELDS = {
    id: true,
    slug: true,
    name: true,
    equipment: true,
    primaryMuscle: true,
    secondaryMuscles: true,
    exerciseType: true,
    isStretch: true,
    frameCount: true,
}

//Listado con busqueda y filtros
router.get("/getExercises", authMiddleware, async (req, res) => {
    try {
        const { search, muscle, equipment, limit } = req.query

        const where = {}
        if (search) {
            where.name = { contains: String(search), mode: 'insensitive' }
        }
        if (muscle) where.primaryMuscle = String(muscle)
        if (equipment) where.equipment = String(equipment)

        const exercises = await prisma.exercise.findMany({
            where,
            select: CATALOG_FIELDS,
            orderBy: { name: 'asc' },
            take: Math.min(parseInt(limit) || 100, 300),
        })

        res.json(exercises)
    } catch (error) {
        res.status(500).json({ error: "Error getting exercises", detail: error.message })
    }
})

//Valores disponibles para armar los filtros del front
router.get("/getFilters", authMiddleware, async (req, res) => {
    try {
        const [muscles, equipment] = await Promise.all([
            prisma.exercise.groupBy({ by: ['primaryMuscle'], _count: true }),
            prisma.exercise.groupBy({ by: ['equipment'], _count: true }),
        ])

        res.json({
            muscles: muscles
                .map(m => ({ value: m.primaryMuscle, count: m._count }))
                .sort((a, b) => b.count - a.count),
            equipment: equipment
                .map(e => ({ value: e.equipment, count: e._count }))
                .sort((a, b) => b.count - a.count),
        })
    } catch (error) {
        res.status(500).json({ error: "Error getting filters", detail: error.message })
    }
})

//Detalle por slug
router.get("/getExercise/:slug", authMiddleware, async (req, res) => {
    try {
        const exercise = await prisma.exercise.findUnique({
            where: { slug: req.params.slug },
            select: CATALOG_FIELDS,
        })
        if (!exercise) { return res.status(404).json({ error: "Exercise not found" }) }
        res.json(exercise)
    } catch (error) {
        res.status(500).json({ error: "Error getting exercise", detail: error.message })
    }
})

module.exports = router;
