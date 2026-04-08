-- Crisis Command Center v2: new models and fields

-- Add expectedDocumentCount to CrisisIncident
ALTER TABLE "CrisisIncident" ADD COLUMN "expectedDocumentCount" INTEGER;

-- Add assignedToId to CrisisDocument
ALTER TABLE "CrisisDocument" ADD COLUMN "assignedToId" TEXT;
ALTER TABLE "CrisisDocument" ADD CONSTRAINT "CrisisDocument_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create CrisisDocumentSnapshot
CREATE TABLE "CrisisDocumentSnapshot" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "instruction" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisDocumentSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrisisDocumentSnapshot_documentId_createdAt_idx" ON "CrisisDocumentSnapshot"("documentId", "createdAt");

ALTER TABLE "CrisisDocumentSnapshot" ADD CONSTRAINT "CrisisDocumentSnapshot_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CrisisDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrisisDocumentSnapshot" ADD CONSTRAINT "CrisisDocumentSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create CrisisMessage
CREATE TABLE "CrisisMessage" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrisisMessage_incidentId_createdAt_idx" ON "CrisisMessage"("incidentId", "createdAt");

ALTER TABLE "CrisisMessage" ADD CONSTRAINT "CrisisMessage_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "CrisisIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrisisMessage" ADD CONSTRAINT "CrisisMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
