-- CreateEnum
CREATE TYPE "QuestCadence" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "PlatformQuestType" AS ENUM ('COMPLETE_ANY_SESSION', 'COMPLETE_SESSIONS_N', 'SCORE_ABOVE_THRESHOLD', 'LEAVE_COMMENT', 'LAUNCH_MARKETPLACE_TOOL', 'COMPLETE_COURSE_TOOL', 'HIGH_SCORE_N_TOOLS');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'EXPIRED');

-- AlterTable
ALTER TABLE "CourseToolLink" ADD COLUMN     "syllabusContext" TEXT,
ADD COLUMN     "weekLabel" TEXT;

-- AlterTable
ALTER TABLE "GamificationConfig" ADD COLUMN     "stepLabel" TEXT,
ADD COLUMN     "totalSteps" INTEGER;

-- AlterTable
ALTER TABLE "ToolSession" ADD COLUMN     "courseId" TEXT;

-- CreateTable
CREATE TABLE "PlatformQuest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cadence" "QuestCadence" NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "sandReward" INTEGER NOT NULL,
    "condition" "PlatformQuestType" NOT NULL,
    "targetValue" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlatformQuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPlatformQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "courseId" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "metricKey" TEXT NOT NULL,
    "sessionId" TEXT,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "challengedId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "challengerScore" DOUBLE PRECISION NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "challengedScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserPlatformQuest_userId_periodStart_idx" ON "UserPlatformQuest"("userId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlatformQuest_userId_questId_periodStart_key" ON "UserPlatformQuest"("userId", "questId", "periodStart");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_toolId_courseId_idx" ON "LeaderboardEntry"("toolId", "courseId");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_userId_idx" ON "LeaderboardEntry"("userId");

-- CreateIndex
CREATE INDEX "Challenge_challengedId_status_idx" ON "Challenge"("challengedId", "status");

-- CreateIndex
CREATE INDEX "Challenge_challengerId_status_idx" ON "Challenge"("challengerId", "status");

-- CreateIndex
CREATE INDEX "Challenge_toolId_idx" ON "Challenge"("toolId");

-- CreateIndex
CREATE INDEX "ToolSession_courseId_idx" ON "ToolSession"("courseId");

-- AddForeignKey
ALTER TABLE "ToolSession" ADD CONSTRAINT "ToolSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlatformQuest" ADD CONSTRAINT "UserPlatformQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlatformQuest" ADD CONSTRAINT "UserPlatformQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "PlatformQuest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
