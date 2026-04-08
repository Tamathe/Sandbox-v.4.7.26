-- AlterTable
ALTER TABLE "Tool"
ADD COLUMN IF NOT EXISTS "audioEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "audioPersonaName" TEXT,
ADD COLUMN IF NOT EXISTS "audioEngine" TEXT NOT NULL DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS "audioVoiceName" TEXT,
ADD COLUMN IF NOT EXISTS "audioSpeakingStyle" TEXT,
ADD COLUMN IF NOT EXISTS "audioSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "audioSystemSuffix" TEXT,
ADD COLUMN IF NOT EXISTS "audioBackgroundTrack" TEXT;

-- AlterTable
ALTER TABLE "ToolSession"
ADD COLUMN IF NOT EXISTS "audioSessionDurationSecs" INTEGER,
ADD COLUMN IF NOT EXISTS "audioActivated" BOOLEAN NOT NULL DEFAULT false;

-- Seed one existing official assistant as audio-ready for discovery/testing
UPDATE "Tool"
SET
  "audioEnabled" = true,
  "audioPersonaName" = 'Finley Audio Guide',
  "audioEngine" = 'openai',
  "audioVoiceName" = 'nova',
  "audioSpeed" = 0.98,
  "audioSystemSuffix" = 'You are in audio mode. Keep responses under 3 sentences. Use no markdown, no bullet lists, and no headers. Speak conversationally, translate financial aid jargon into simple action steps, and close with one clear next move.'
WHERE "id" = 'tool-financial-aid-advisor';
