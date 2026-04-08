-- CreateTable
CREATE TABLE "DivergenceSnapshot" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "scenario" TEXT NOT NULL,
  "totalTurns" INTEGER NOT NULL,
  "treeJson" JSONB NOT NULL,
  "clusterCount" INTEGER NOT NULL,
  "keyDecisionPoints" JSONB NOT NULL,
  "participantPaths" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DivergenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DivergenceSnapshot_roomId_key"
ON "DivergenceSnapshot"("roomId");

CREATE INDEX "DivergenceSnapshot_createdAt_idx"
ON "DivergenceSnapshot"("createdAt");

-- AddForeignKey
ALTER TABLE "DivergenceSnapshot"
ADD CONSTRAINT "DivergenceSnapshot_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "LiveRoom"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
