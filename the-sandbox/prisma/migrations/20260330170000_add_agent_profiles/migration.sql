-- CreateEnum
CREATE TYPE "AgentCategory" AS ENUM (
  'GENERAL',
  'STUDY',
  'PRODUCTIVITY',
  'ANALYSIS',
  'COMMUNICATION',
  'COACHING',
  'MONITORING',
  'CREATIVE'
);

-- CreateEnum
CREATE TYPE "AgentVisibility" AS ENUM ('PRIVATE', 'SHARED', 'INSTITUTIONAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeAgentId" TEXT;

-- CreateTable
CREATE TABLE "AgentProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT 'Bot',
  "color" TEXT NOT NULL DEFAULT '#0033A0',
  "systemPrompt" TEXT NOT NULL,
  "capabilities" TEXT[],
  "welcomeMessage" TEXT,
  "starterQuestions" TEXT[],
  "maxActionsPerRun" INTEGER NOT NULL DEFAULT 10,
  "category" "AgentCategory" NOT NULL DEFAULT 'GENERAL',
  "tags" TEXT[],
  "targetRoles" "UserRole"[],
  "visibility" "AgentVisibility" NOT NULL DEFAULT 'PRIVATE',
  "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'COMMUNITY',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "creatorId" TEXT NOT NULL,
  "forkedFromId" TEXT,
  "useCount" INTEGER NOT NULL DEFAULT 0,
  "forkCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSession" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messages" JSONB NOT NULL,
  "toolCallCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentFavorite" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_slug_key" ON "AgentProfile"("slug");
CREATE INDEX "AgentProfile_creatorId_idx" ON "AgentProfile"("creatorId");
CREATE INDEX "AgentProfile_visibility_approvalStatus_idx" ON "AgentProfile"("visibility", "approvalStatus");
CREATE INDEX "AgentProfile_category_idx" ON "AgentProfile"("category");
CREATE INDEX "AgentProfile_slug_idx" ON "AgentProfile"("slug");
CREATE UNIQUE INDEX "AgentSession_profileId_userId_key" ON "AgentSession"("profileId", "userId");
CREATE INDEX "AgentSession_profileId_idx" ON "AgentSession"("profileId");
CREATE INDEX "AgentSession_userId_idx" ON "AgentSession"("userId");
CREATE UNIQUE INDEX "AgentFavorite_profileId_userId_key" ON "AgentFavorite"("profileId", "userId");
CREATE INDEX "AgentFavorite_userId_idx" ON "AgentFavorite"("userId");

-- AddForeignKey
ALTER TABLE "AgentProfile"
ADD CONSTRAINT "AgentProfile_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentProfile"
ADD CONSTRAINT "AgentProfile_forkedFromId_fkey"
FOREIGN KEY ("forkedFromId") REFERENCES "AgentProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentSession"
ADD CONSTRAINT "AgentSession_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "AgentProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentSession"
ADD CONSTRAINT "AgentSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentFavorite"
ADD CONSTRAINT "AgentFavorite_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "AgentProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentFavorite"
ADD CONSTRAINT "AgentFavorite_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
