-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ToolType" ADD VALUE 'SIMULATION';
ALTER TYPE "ToolType" ADD VALUE 'QUIZ';
ALTER TYPE "ToolType" ADD VALUE 'AI_INTERVIEW';
ALTER TYPE "ToolType" ADD VALUE 'DEBATE';

-- CreateTable
CREATE TABLE "BuildSession" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT,
    "toolSpec" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolDocument" (
    "id" TEXT NOT NULL,
    "toolId" TEXT,
    "sessionId" TEXT,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'application/pdf',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BuildSession" ADD CONSTRAINT "BuildSession_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolDocument" ADD CONSTRAINT "ToolDocument_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolDocument" ADD CONSTRAINT "ToolDocument_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BuildSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
