-- CreateTable
CREATE TABLE "BracketPool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 2026,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "scoringType" TEXT NOT NULL DEFAULT 'standard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketEntry" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "picks" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketGame" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "team1" TEXT,
    "team2" TEXT,
    "winner" TEXT,
    "played" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BracketGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BracketEmailSub" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BracketEmailSub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookEntry" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "likedReason" TEXT,
    "disliked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookRecommendation" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "year" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookDigestSub" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookDigestSub_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BracketPool_joinCode_key" ON "BracketPool"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "BracketEntry_poolId_userId_key" ON "BracketEntry"("poolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketGame_poolId_gameNumber_key" ON "BracketGame"("poolId", "gameNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BracketEmailSub_poolId_userId_key" ON "BracketEmailSub"("poolId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookProfile_userId_key" ON "BookProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookDigestSub_profileId_key" ON "BookDigestSub"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "BookDigestSub_userId_key" ON "BookDigestSub"("userId");

-- AddForeignKey
ALTER TABLE "BracketPool" ADD CONSTRAINT "BracketPool_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketEntry" ADD CONSTRAINT "BracketEntry_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "BracketPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketEntry" ADD CONSTRAINT "BracketEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketGame" ADD CONSTRAINT "BracketGame_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "BracketPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketEmailSub" ADD CONSTRAINT "BracketEmailSub_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "BracketPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BracketEmailSub" ADD CONSTRAINT "BracketEmailSub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookProfile" ADD CONSTRAINT "BookProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookEntry" ADD CONSTRAINT "BookEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BookProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookRecommendation" ADD CONSTRAINT "BookRecommendation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BookProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookDigestSub" ADD CONSTRAINT "BookDigestSub_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "BookProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookDigestSub" ADD CONSTRAINT "BookDigestSub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
