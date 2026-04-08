-- AlterEnum
ALTER TYPE "AssignmentType" ADD VALUE 'TOOL_ASSESSMENT';

-- AlterTable: Add MEI fields to Assignment
ALTER TABLE "Assignment" ADD COLUMN "minimumAttempts" INTEGER DEFAULT 3,
ADD COLUMN "assessmentToolIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "assessmentWindowEnd" TIMESTAMP(3);

-- CreateTable: MasteryEfficiencyScore
CREATE TABLE "MasteryEfficiencyScore" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "meiScore" DOUBLE PRECISION NOT NULL,
    "durationTrend" DOUBLE PRECISION NOT NULL,
    "scoreTrend" DOUBLE PRECISION NOT NULL,
    "hintIndependence" DOUBLE PRECISION NOT NULL,
    "reformulationDecline" DOUBLE PRECISION NOT NULL,
    "bloomCeiling" DOUBLE PRECISION NOT NULL,
    "sessionsAnalyzed" INTEGER NOT NULL,
    "qualifiedSessionIds" TEXT[],
    "firstSessionAt" TIMESTAMP(3) NOT NULL,
    "lastSessionAt" TIMESTAMP(3) NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasteryEfficiencyScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasteryEfficiencyScore_assignmentId_studentId_key" ON "MasteryEfficiencyScore"("assignmentId", "studentId");
CREATE INDEX "MasteryEfficiencyScore_courseId_idx" ON "MasteryEfficiencyScore"("courseId");
CREATE INDEX "MasteryEfficiencyScore_studentId_idx" ON "MasteryEfficiencyScore"("studentId");
CREATE INDEX "MasteryEfficiencyScore_assignmentId_idx" ON "MasteryEfficiencyScore"("assignmentId");

-- AddForeignKey
ALTER TABLE "MasteryEfficiencyScore" ADD CONSTRAINT "MasteryEfficiencyScore_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MasteryEfficiencyScore" ADD CONSTRAINT "MasteryEfficiencyScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MasteryEfficiencyScore" ADD CONSTRAINT "MasteryEfficiencyScore_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
