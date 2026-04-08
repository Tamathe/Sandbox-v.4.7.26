-- CreateTable
CREATE TABLE "LearningObjective" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "materialId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "moduleNumber" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentObjectiveProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentObjectiveProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningObjective_courseId_moduleNumber_idx" ON "LearningObjective"("courseId", "moduleNumber");

-- CreateIndex
CREATE INDEX "StudentObjectiveProgress_studentId_courseId_idx" ON "StudentObjectiveProgress"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "StudentObjectiveProgress_objectiveId_idx" ON "StudentObjectiveProgress"("objectiveId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentObjectiveProgress_studentId_objectiveId_key" ON "StudentObjectiveProgress"("studentId", "objectiveId");

-- AddForeignKey
ALTER TABLE "LearningObjective" ADD CONSTRAINT "LearningObjective_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObjective" ADD CONSTRAINT "LearningObjective_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "CourseMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentObjectiveProgress" ADD CONSTRAINT "StudentObjectiveProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentObjectiveProgress" ADD CONSTRAINT "StudentObjectiveProgress_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "LearningObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
