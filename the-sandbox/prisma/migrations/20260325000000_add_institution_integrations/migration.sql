-- CreateEnum
CREATE TYPE "InstitutionIntegrationKey" AS ENUM (
  'OUTLOOK_GRAPH_ASSISTANT',
  'CANVAS',
  'SIS',
  'SHAREPOINT_ONEDRIVE_FILES'
);

-- CreateEnum
CREATE TYPE "InstitutionIntegrationSystem" AS ENUM (
  'MICROSOFT_GRAPH',
  'CANVAS',
  'SIS_BANNER',
  'SHAREPOINT_ONEDRIVE'
);

-- CreateEnum
CREATE TYPE "InstitutionIntegrationMode" AS ENUM (
  'SIMULATED',
  'REAL'
);

-- CreateEnum
CREATE TYPE "InstitutionIntegrationStatus" AS ENUM (
  'HEALTHY',
  'DEGRADED',
  'BLOCKED',
  'NOT_CONFIGURED'
);

-- CreateTable
CREATE TABLE "InstitutionIntegration" (
  "id" TEXT NOT NULL,
  "institutionKey" TEXT NOT NULL DEFAULT 'default',
  "key" "InstitutionIntegrationKey" NOT NULL,
  "system" "InstitutionIntegrationSystem" NOT NULL,
  "mode" "InstitutionIntegrationMode" NOT NULL DEFAULT 'SIMULATED',
  "status" "InstitutionIntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "configured" BOOLEAN NOT NULL DEFAULT false,
  "authMode" TEXT,
  "baseUrl" TEXT,
  "tenantHint" TEXT,
  "dataOwner" TEXT,
  "syncDirection" TEXT,
  "metadata" JSONB,
  "lastCheckedAt" TIMESTAMP(3),
  "lastHealthyAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InstitutionIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstitutionIntegration_institutionKey_status_idx" ON "InstitutionIntegration"("institutionKey", "status");

-- CreateIndex
CREATE INDEX "InstitutionIntegration_system_mode_idx" ON "InstitutionIntegration"("system", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionIntegration_institutionKey_key_key" ON "InstitutionIntegration"("institutionKey", "key");
