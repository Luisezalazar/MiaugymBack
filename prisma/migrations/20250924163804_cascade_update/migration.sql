-- DropForeignKey
ALTER TABLE "public"."RoutineExercise" DROP CONSTRAINT "RoutineExercise_routineId_fkey";

-- AddForeignKey
ALTER TABLE "public"."RoutineExercise" ADD CONSTRAINT "RoutineExercise_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "public"."Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
