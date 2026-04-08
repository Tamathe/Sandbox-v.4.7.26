-- CreateEnum
CREATE TYPE "GateStatus" AS ENUM (
  'LOCKED',
  'AVAILABLE',
  'IN_PROGRESS',
  'PASSED',
  'FAILED_RETRY'
);

-- CreateTable
CREATE TABLE "MasteryGate" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "weekId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "concepts" TEXT[] NOT NULL,
  "bloomFloor" INTEGER NOT NULL DEFAULT 3,
  "passThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "cooldownHours" INTEGER NOT NULL DEFAULT 24,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "unlocksWeekId" TEXT,
  "unlocksGateId" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MasteryGate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasteryGateAttempt" (
  "id" TEXT NOT NULL,
  "gateId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "GateStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "attemptNumber" INTEGER NOT NULL,
  "questionsAsked" JSONB NOT NULL,
  "totalQuestions" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "masteryByConceptJson" JSONB NOT NULL,
  "gapDiagnosis" JSONB,
  "overallScore" DOUBLE PRECISION,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "MasteryGateAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MasteryGate_courseId_idx" ON "MasteryGate"("courseId");
CREATE INDEX "MasteryGate_courseId_isPublished_idx" ON "MasteryGate"("courseId", "isPublished");
CREATE INDEX "MasteryGate_weekId_idx" ON "MasteryGate"("weekId");
CREATE UNIQUE INDEX "MasteryGate_courseId_orderIndex_key" ON "MasteryGate"("courseId", "orderIndex");

CREATE INDEX "MasteryGateAttempt_gateId_userId_idx" ON "MasteryGateAttempt"("gateId", "userId");
CREATE INDEX "MasteryGateAttempt_userId_startedAt_idx" ON "MasteryGateAttempt"("userId", "startedAt");
CREATE UNIQUE INDEX "MasteryGateAttempt_gateId_userId_attemptNumber_key"
ON "MasteryGateAttempt"("gateId", "userId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "MasteryGate"
ADD CONSTRAINT "MasteryGate_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MasteryGate"
ADD CONSTRAINT "MasteryGate_weekId_fkey"
FOREIGN KEY ("weekId") REFERENCES "CourseWeek"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MasteryGateAttempt"
ADD CONSTRAINT "MasteryGateAttempt_gateId_fkey"
FOREIGN KEY ("gateId") REFERENCES "MasteryGate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MasteryGateAttempt"
ADD CONSTRAINT "MasteryGateAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
