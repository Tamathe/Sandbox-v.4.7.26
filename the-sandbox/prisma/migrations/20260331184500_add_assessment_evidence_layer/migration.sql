-- CreateEnum
CREATE TYPE "AssessmentMode" AS ENUM (
  'TRADITIONAL',
  'PROCESS',
  'DIVERGENCE',
  'TEACHBACK',
  'CROSS_EXAM',
  'AUTHENTIC',
  'MASTERY_GATE'
);

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM (
  'SANDY_TRANSCRIPT',
  'SIMULATION_THREAD',
  'TEACHBACK_SESSION',
  'PEER_REVIEW_SESSION',
  'DEBATE_SESSION',
  'FISHBOWL_SESSION',
  'TOOL_USAGE',
  'FLASHCARD_MASTERY',
  'CONCEPT_MASTERY',
  'STUDENT_ANNOTATION'
);

-- AlterTable
ALTER TABLE "Assignment"
ADD COLUMN "assessmentMode" "AssessmentMode" NOT NULL DEFAULT 'TRADITIONAL',
ADD COLUMN "assessmentConfig" JSONB,
ADD COLUMN "evidenceTypes" "EvidenceType"[] NOT NULL DEFAULT ARRAY[]::"EvidenceType"[],
ADD COLUMN "processWeight" DOUBLE PRECISION;

ALTER TABLE "GradebookEntry"
ADD COLUMN "compositeMethod" TEXT,
ADD COLUMN "processScore" DOUBLE PRECISION;

ALTER TABLE "LiveRoom"
ADD COLUMN "assignmentId" TEXT,
ADD COLUMN "assessmentMode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AssessmentEvidence" (
  "id" TEXT NOT NULL,
  "gradebookEntryId" TEXT NOT NULL,
  "evidenceType" "EvidenceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceLabel" TEXT NOT NULL,
  "studentAnnotation" TEXT,
  "annotatedAt" TIMESTAMP(3),
  "aiProcessScore" DOUBLE PRECISION,
  "aiCoherenceScore" DOUBLE PRECISION,
  "aiDepthScore" DOUBLE PRECISION,
  "aiScoringRationale" TEXT,
  "facultyScore" DOUBLE PRECISION,
  "facultyNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AssessmentEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentEvidence_gradebookEntryId_evidenceType_sourceId_key"
ON "AssessmentEvidence"("gradebookEntryId", "evidenceType", "sourceId");

CREATE INDEX "AssessmentEvidence_gradebookEntryId_idx"
ON "AssessmentEvidence"("gradebookEntryId");

CREATE INDEX "AssessmentEvidence_sourceId_evidenceType_idx"
ON "AssessmentEvidence"("sourceId", "evidenceType");

CREATE INDEX "LiveRoom_assignmentId_idx"
ON "LiveRoom"("assignmentId");

-- AddForeignKey
ALTER TABLE "AssessmentEvidence"
ADD CONSTRAINT "AssessmentEvidence_gradebookEntryId_fkey"
FOREIGN KEY ("gradebookEntryId") REFERENCES "GradebookEntry"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveRoom"
ADD CONSTRAINT "LiveRoom_assignmentId_fkey"
FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
