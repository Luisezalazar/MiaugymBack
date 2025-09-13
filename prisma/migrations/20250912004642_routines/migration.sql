/*
  Warnings:

  - Added the required column `personId` to the `Routine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `routineExerciseId` to the `Routine` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Person" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Routine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "routineExerciseId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    CONSTRAINT "Routine_routineExerciseId_fkey" FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Routine_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Routine" ("id", "name") SELECT "id", "name" FROM "Routine";
DROP TABLE "Routine";
ALTER TABLE "new_Routine" RENAME TO "Routine";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
