-- AlterTable
ALTER TABLE "public"."Exercise" ADD COLUMN     "equipment" TEXT NOT NULL,
ADD COLUMN     "exerciseType" TEXT NOT NULL,
ADD COLUMN     "frameCount" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "isStretch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "primaryMuscle" TEXT NOT NULL,
ADD COLUMN     "secondaryMuscles" TEXT[],
ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."RoutineExercise" ADD COLUMN     "exerciseId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "public"."Exercise"("slug");

-- CreateIndex
CREATE INDEX "Exercise_primaryMuscle_idx" ON "public"."Exercise"("primaryMuscle");

-- CreateIndex
CREATE INDEX "Exercise_equipment_idx" ON "public"."Exercise"("equipment");

-- AddForeignKey
ALTER TABLE "public"."RoutineExercise" ADD CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

