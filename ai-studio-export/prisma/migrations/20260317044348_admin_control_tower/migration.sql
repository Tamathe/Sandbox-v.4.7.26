-- AlterEnum
ALTER TYPE "ApprovalStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "flagCategory" TEXT,
ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokensUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "fastTrackApprovedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "AdminAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandcastleSubmission" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "emoji" TEXT,
    "sandCost" INTEGER NOT NULL DEFAULT 0,
    "systemPrompt" TEXT NOT NULL,
    "starterPrompts" TEXT[],
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "aiVerdict" TEXT,
    "aiRejectReason" TEXT,
    "aiFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creatorId" TEXT NOT NULL,
    "reviewedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SandcastleSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAnnouncement_isActive_startsAt_idx" ON "AdminAnnouncement"("isActive", "startsAt");

-- CreateIndex
CREATE INDEX "AdminAnnouncement_createdById_createdAt_idx" ON "AdminAnnouncement"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx" ON "AdminAuditLog"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SandcastleSubmission_slug_key" ON "SandcastleSubmission"("slug");

-- CreateIndex
CREATE INDEX "SandcastleSubmission_approvalStatus_createdAt_idx" ON "SandcastleSubmission"("approvalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "SandcastleSubmission_creatorId_createdAt_idx" ON "SandcastleSubmission"("creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_flagged_createdAt_idx" ON "ChatMessage"("flagged", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminAnnouncement" ADD CONSTRAINT "AdminAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandcastleSubmission" ADD CONSTRAINT "SandcastleSubmission_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandcastleSubmission" ADD CONSTRAINT "SandcastleSubmission_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
