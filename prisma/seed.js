/*
  Carga el catalogo de ejercicios en la tabla Exercise.

  Los datos salen de prisma/data/exercises.json, una version reducida del
  manifest de workout-guide (https://github.com/bryllim/workout-guide).
  Imagenes y datos: CC BY-SA 4.0 por Bryl Lim, derivados de Everkinetic.

  Es idempotente: usa upsert por slug, asi que se puede correr las veces
  que haga falta sin duplicar ni perder los vinculos de las rutinas.

      npm run seed
*/
require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const exercises = require('./data/exercises.json')

const prisma = new PrismaClient()

async function main() {
    console.log(`Importando ${exercises.length} ejercicios...`)

    let creados = 0
    let actualizados = 0

    for (const e of exercises) {
        const data = {
            name: e.name,
            exerciseType: e.exerciseType,
            equipment: e.equipment,
            primaryMuscle: e.primaryMuscle,
            secondaryMuscles: e.secondaryMuscles || [],
            isStretch: Boolean(e.isStretch),
            frameCount: e.frameCount || 3,
        }

        const previo = await prisma.exercise.findUnique({ where: { slug: e.slug } })

        await prisma.exercise.upsert({
            where: { slug: e.slug },
            update: data,
            create: { slug: e.slug, ...data },
        })

        if (previo) actualizados++
        else creados++
    }

    const total = await prisma.exercise.count()
    console.log(`  creados:      ${creados}`)
    console.log(`  actualizados: ${actualizados}`)
    console.log(`  total en la base: ${total}`)
}

main()
    .catch((e) => {
        console.error('Error en el seed:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
