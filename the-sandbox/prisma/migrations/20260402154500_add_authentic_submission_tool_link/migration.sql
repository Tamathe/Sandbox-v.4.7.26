ALTER TABLE "Submission"
ADD COLUMN "linkedToolId" TEXT;

CREATE INDEX "Submission_linkedToolId_idx"
ON "Submission"("linkedToolId");

ALTER TABLE "Submission"
ADD CONSTRAINT "Submission_linkedToolId_fkey"
FOREIGN KEY ("linkedToolId") REFERENCES "Tool"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
