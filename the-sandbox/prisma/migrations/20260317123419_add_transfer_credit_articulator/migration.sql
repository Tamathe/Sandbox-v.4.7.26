-- CreateEnum
CREATE TYPE "ArticulationRecommendation" AS ENUM ('APPROVE', 'DENY', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ArticulationStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "ArticulationRequest" (
    "id" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "externalCourseTitle" TEXT NOT NULL,
    "externalInstitution" TEXT NOT NULL,
    "externalSyllabus" TEXT NOT NULL,
    "internalCourseCode" TEXT NOT NULL,
    "internalCourseTitle" TEXT NOT NULL,
    "internalCourseDescription" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "recommendation" "ArticulationRecommendation" NOT NULL,
    "status" "ArticulationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticulationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticulationRequest_studentEmail_createdAt_idx" ON "ArticulationRequest"("studentEmail", "createdAt");

-- CreateIndex
CREATE INDEX "ArticulationRequest_status_createdAt_idx" ON "ArticulationRequest"("status", "createdAt");
