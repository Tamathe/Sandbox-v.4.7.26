-- CreateTable
CREATE TABLE "CompetencyRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "competency" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  "courseIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "evidenceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "conceptSlugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "bloomHighWater" INTEGER,
  "firstDemonstrated" TIMESTAMP(3) NOT NULL,
  "lastDemonstrated" TIMESTAMP(3) NOT NULL,
  "decayedScore" DOUBLE PRECISION,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompetencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyRecord_userId_competency_key"
ON "CompetencyRecord"("userId", "competency");

CREATE INDEX "CompetencyRecord_userId_idx"
ON "CompetencyRecord"("userId");

-- AddForeignKey
ALTER TABLE "CompetencyRecord"
ADD CONSTRAINT "CompetencyRecord_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
