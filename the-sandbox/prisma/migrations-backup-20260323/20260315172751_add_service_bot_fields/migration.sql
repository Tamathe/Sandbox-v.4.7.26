-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "isOfficialService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceProtocol" TEXT;

-- CreateIndex
CREATE INDEX "Tool_isOfficialService_idx" ON "Tool"("isOfficialService");
