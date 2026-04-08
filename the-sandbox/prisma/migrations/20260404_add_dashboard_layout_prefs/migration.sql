-- AlterTable
ALTER TABLE "SandyPreference" ADD COLUMN "widgetOrder" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "SandyPreference" ADD COLUMN "collapsedWidgets" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "SandyPreference" ADD COLUMN "dashboardDensity" TEXT NOT NULL DEFAULT 'comfortable';
