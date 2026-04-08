-- CreateEnum
CREATE TYPE "ToolDeploymentMode" AS ENUM ('DRAFT', 'PRIVATE', 'MARKETPLACE');

-- AlterTable
ALTER TABLE "Tool"
ADD COLUMN "deploymentMode" "ToolDeploymentMode" NOT NULL DEFAULT 'DRAFT';

-- Backfill published tools into marketplace mode
UPDATE "Tool"
SET "deploymentMode" = 'MARKETPLACE'
WHERE "published" = true;

-- CreateIndex
CREATE INDEX "Tool_deploymentMode_published_idx" ON "Tool"("deploymentMode", "published");
