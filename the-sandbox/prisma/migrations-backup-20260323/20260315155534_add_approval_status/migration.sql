-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('COMMUNITY', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'COMMUNITY';

-- CreateIndex
CREATE INDEX "Tool_approvalStatus_idx" ON "Tool"("approvalStatus");
