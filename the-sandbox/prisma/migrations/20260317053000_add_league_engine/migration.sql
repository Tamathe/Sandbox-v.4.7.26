-- CreateEnum
CREATE TYPE "LeagueKind" AS ENUM ('PREDICTION_MARKET', 'SURVIVOR_POOL', 'COFFEE_ROULETTE', 'WEEKLY_TRIVIA', 'PITCH_COMPETITION', 'MEETING_BINGO', 'SECRET_SANTA', 'FANTASY_TRADING');

-- CreateEnum
CREATE TYPE "LeagueStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeagueCadence" AS ENUM ('ONE_OFF', 'WEEKLY', 'SEASONAL');

-- CreateEnum
CREATE TYPE "LeagueCycleStatus" AS ENUM ('OPEN', 'LOCKED', 'CLOSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "LeagueMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'JUDGE');

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "LeagueKind" NOT NULL,
    "status" "LeagueStatus" NOT NULL DEFAULT 'DRAFT',
    "joinCode" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "toolId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "cadence" "LeagueCadence" NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "nextDigestAt" TIMESTAMP(3),
    "scoringMetric" TEXT NOT NULL DEFAULT 'score',
    "configJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "LeagueMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3),
    "statsJson" JSONB,

    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueCycle" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "LeagueCycleStatus" NOT NULL DEFAULT 'OPEN',
    "opensAt" TIMESTAMP(3) NOT NULL,
    "locksAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "stateJson" JSONB NOT NULL,
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueSubmission" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "payloadJson" JSONB NOT NULL,
    "scoreDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiebreaker" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "LeagueSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueStanding" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadataJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueEmailSub" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueEmailSub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueEvent" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "cycleId" TEXT,
    "actorUserId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "League_joinCode_key" ON "League"("joinCode");

-- CreateIndex
CREATE INDEX "League_kind_status_idx" ON "League"("kind", "status");

-- CreateIndex
CREATE INDEX "League_creatorId_createdAt_idx" ON "League"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "LeagueMember_userId_idx" ON "LeagueMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMember_leagueId_userId_key" ON "LeagueMember"("leagueId", "userId");

-- CreateIndex
CREATE INDEX "LeagueCycle_leagueId_status_opensAt_idx" ON "LeagueCycle"("leagueId", "status", "opensAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueCycle_leagueId_cycleNumber_key" ON "LeagueCycle"("leagueId", "cycleNumber");

-- CreateIndex
CREATE INDEX "LeagueSubmission_leagueId_submittedAt_idx" ON "LeagueSubmission"("leagueId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSubmission_cycleId_memberId_key" ON "LeagueSubmission"("cycleId", "memberId");

-- CreateIndex
CREATE INDEX "LeagueStanding_leagueId_rank_idx" ON "LeagueStanding"("leagueId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueStanding_leagueId_memberId_key" ON "LeagueStanding"("leagueId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueEmailSub_leagueId_userId_key" ON "LeagueEmailSub"("leagueId", "userId");

-- CreateIndex
CREATE INDEX "LeagueEvent_leagueId_createdAt_idx" ON "LeagueEvent"("leagueId", "createdAt");

-- CreateIndex
CREATE INDEX "LeagueEvent_cycleId_createdAt_idx" ON "LeagueEvent"("cycleId", "createdAt");

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueCycle" ADD CONSTRAINT "LeagueCycle_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSubmission" ADD CONSTRAINT "LeagueSubmission_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSubmission" ADD CONSTRAINT "LeagueSubmission_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "LeagueCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSubmission" ADD CONSTRAINT "LeagueSubmission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LeagueMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueStanding" ADD CONSTRAINT "LeagueStanding_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueStanding" ADD CONSTRAINT "LeagueStanding_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LeagueMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEmailSub" ADD CONSTRAINT "LeagueEmailSub_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEmailSub" ADD CONSTRAINT "LeagueEmailSub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEvent" ADD CONSTRAINT "LeagueEvent_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEvent" ADD CONSTRAINT "LeagueEvent_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "LeagueCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueEvent" ADD CONSTRAINT "LeagueEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

