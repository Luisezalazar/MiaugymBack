-- AlterTable
ALTER TABLE "public"."RoutineExercise" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
-- series pasa de TEXT a INTEGER conservando los datos existentes.
-- Prisma proponia DROP + ADD (destructivo); el cast con USING preserva los valores.
-- Se limpian caracteres no numericos y lo que quede vacio cae a 0.
ALTER TABLE "public"."RoutineExercise"
    ALTER COLUMN "series" TYPE INTEGER
    USING COALESCE(NULLIF(regexp_replace("series", '[^0-9]', '', 'g'), '')::integer, 0);

-- CreateTable
CREATE TABLE "public"."Goal" (
    "id" SERIAL NOT NULL,
    "weight" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personId" INTEGER NOT NULL,
    "objective" TEXT NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GoalImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "goalId" INTEGER,

    CONSTRAINT "GoalImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GoalImage" ADD CONSTRAINT "GoalImage_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "public"."Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
