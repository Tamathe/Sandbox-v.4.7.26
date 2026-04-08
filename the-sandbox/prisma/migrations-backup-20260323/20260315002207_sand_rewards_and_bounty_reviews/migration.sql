-- AlterTable
ALTER TABLE "Bounty" ADD COLUMN     "rewardSand" INTEGER NOT NULL DEFAULT 250;

-- CreateTable
CREATE TABLE "SandTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "bountyId" TEXT,
    "toolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SandTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BountyReview" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "promptUsed" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BountyReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SandTransaction_userId_createdAt_idx" ON "SandTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SandTransaction_bountyId_idx" ON "SandTransaction"("bountyId");

-- CreateIndex
CREATE INDEX "SandTransaction_toolId_idx" ON "SandTransaction"("toolId");

-- CreateIndex
CREATE INDEX "BountyReview_bountyId_createdAt_idx" ON "BountyReview"("bountyId", "createdAt");

-- CreateIndex
CREATE INDEX "BountyReview_reviewerId_createdAt_idx" ON "BountyReview"("reviewerId", "createdAt");

-- AddForeignKey
ALTER TABLE "SandTransaction" ADD CONSTRAINT "SandTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandTransaction" ADD CONSTRAINT "SandTransaction_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandTransaction" ADD CONSTRAINT "SandTransaction_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BountyReview" ADD CONSTRAINT "BountyReview_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BountyReview" ADD CONSTRAINT "BountyReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
