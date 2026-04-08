-- CreateEnum
CREATE TYPE "CollabMode" AS ENUM ('CO_PRESENCE', 'TURN_BASED', 'ARTIFACT_BUILDER', 'COLLABORATIVE_QUEST');

-- CreateEnum
CREATE TYPE "CollabSessionStatus" AS ENUM ('WAITING', 'ACTIVE', 'ENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CollabMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- AlterTable
ALTER TABLE "GamificationConfig" ADD COLUMN     "collabCompletionBonus" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "collabXpMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5;

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "collabEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collabMaxUsers" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "collabModes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CollabSession" (
    "id" TEXT NOT NULL,
    "toolSessionId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "mode" "CollabMode" NOT NULL DEFAULT 'CO_PRESENCE',
    "status" "CollabSessionStatus" NOT NULL DEFAULT 'WAITING',
    "maxParticipants" INTEGER NOT NULL DEFAULT 4,
    "turnDurationSeconds" INTEGER,
    "currentTurnUserId" TEXT,
    "currentTurnStartedAt" TIMESTAMP(3),
    "turnNumber" INTEGER NOT NULL DEFAULT 0,
    "artifactContent" TEXT,
    "artifactTitle" TEXT,
    "artifactUpdatedAt" TIMESTAMP(3),
    "teamScore" INTEGER NOT NULL DEFAULT 0,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CollabSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollabParticipant" (
    "id" TEXT NOT NULL,
    "collabSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolSessionId" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "turnOrder" INTEGER,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollabParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollabMessage" (
    "id" TEXT NOT NULL,
    "collabSessionId" TEXT NOT NULL,
    "senderId" TEXT,
    "role" "CollabMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "turnNumber" INTEGER,
    "triggeredArtifactUpdate" BOOLEAN NOT NULL DEFAULT false,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollabMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollabSession_toolSessionId_key" ON "CollabSession"("toolSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CollabSession_joinCode_key" ON "CollabSession"("joinCode");

-- CreateIndex
CREATE INDEX "CollabSession_joinCode_idx" ON "CollabSession"("joinCode");

-- CreateIndex
CREATE INDEX "CollabSession_hostId_idx" ON "CollabSession"("hostId");

-- CreateIndex
CREATE INDEX "CollabSession_toolId_createdAt_idx" ON "CollabSession"("toolId", "createdAt");

-- CreateIndex
CREATE INDEX "CollabSession_status_createdAt_idx" ON "CollabSession"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CollabParticipant_toolSessionId_key" ON "CollabParticipant"("toolSessionId");

-- CreateIndex
CREATE INDEX "CollabParticipant_collabSessionId_isActive_idx" ON "CollabParticipant"("collabSessionId", "isActive");

-- CreateIndex
CREATE INDEX "CollabParticipant_userId_idx" ON "CollabParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollabParticipant_collabSessionId_userId_key" ON "CollabParticipant"("collabSessionId", "userId");

-- CreateIndex
CREATE INDEX "CollabMessage_collabSessionId_createdAt_idx" ON "CollabMessage"("collabSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "CollabMessage_senderId_idx" ON "CollabMessage"("senderId");

-- CreateIndex
CREATE INDEX "CollabMessage_collabSessionId_clientMessageId_idx" ON "CollabMessage"("collabSessionId", "clientMessageId");

-- AddForeignKey
ALTER TABLE "CollabSession" ADD CONSTRAINT "CollabSession_toolSessionId_fkey" FOREIGN KEY ("toolSessionId") REFERENCES "ToolSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabSession" ADD CONSTRAINT "CollabSession_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabSession" ADD CONSTRAINT "CollabSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabSession" ADD CONSTRAINT "CollabSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabParticipant" ADD CONSTRAINT "CollabParticipant_collabSessionId_fkey" FOREIGN KEY ("collabSessionId") REFERENCES "CollabSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabParticipant" ADD CONSTRAINT "CollabParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabParticipant" ADD CONSTRAINT "CollabParticipant_toolSessionId_fkey" FOREIGN KEY ("toolSessionId") REFERENCES "ToolSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabMessage" ADD CONSTRAINT "CollabMessage_collabSessionId_fkey" FOREIGN KEY ("collabSessionId") REFERENCES "CollabSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabMessage" ADD CONSTRAINT "CollabMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed a few existing conversational tools for collaboration testing
UPDATE "Tool"
SET
  "collabEnabled" = true,
  "collabModes" = ARRAY['CO_PRESENCE']::TEXT[],
  "collabMaxUsers" = 4
WHERE "id" IN (
  'tool-case-brief-architect',
  'tool-moot-court-simulator',
  'tool-client-interview-trainer',
  'tool-legal-ethics-advisor',
  'tool-bar-exam-issue-spotter',
  'tool-thesis-builder'
);
