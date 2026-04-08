-- CreateEnum
CREATE TYPE "CollabStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "personalContext" TEXT;

-- CreateTable
CREATE TABLE "CollabRequest" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "CollabStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollabRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollabReview" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "transcript" TEXT,
    "summary" TEXT,
    "rating" INTEGER,
    "aiGuidedAnswers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollabReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollabRequest_status_createdAt_idx" ON "CollabRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CollabRequest_requesterId_idx" ON "CollabRequest"("requesterId");

-- AddForeignKey
ALTER TABLE "CollabRequest" ADD CONSTRAINT "CollabRequest_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabRequest" ADD CONSTRAINT "CollabRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabReview" ADD CONSTRAINT "CollabReview_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CollabRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabReview" ADD CONSTRAINT "CollabReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
