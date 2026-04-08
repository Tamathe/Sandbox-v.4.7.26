-- Add indexes for frequent query patterns
CREATE INDEX IF NOT EXISTS "Tool_creatorId_idx" ON "Tool"("creatorId");
CREATE INDEX IF NOT EXISTS "Tool_published_createdAt_idx" ON "Tool"("published", "createdAt");
CREATE INDEX IF NOT EXISTS "Tool_category_idx" ON "Tool"("category");
CREATE INDEX IF NOT EXISTS "Tool_toolType_idx" ON "Tool"("toolType");

CREATE INDEX IF NOT EXISTS "MetricEvent_toolId_idx" ON "MetricEvent"("toolId");
CREATE INDEX IF NOT EXISTS "ToolSession_toolId_startedAt_idx" ON "ToolSession"("toolId", "startedAt");

CREATE INDEX IF NOT EXISTS "ToolDocument_toolId_idx" ON "ToolDocument"("toolId");
CREATE INDEX IF NOT EXISTS "ToolDocument_sessionId_idx" ON "ToolDocument"("sessionId");

-- Add CASCADE deletes so DB enforces referential integrity
-- (These match the onDelete: Cascade settings added to schema.prisma)
ALTER TABLE "Upvote" DROP CONSTRAINT IF EXISTS "Upvote_toolId_fkey";
ALTER TABLE "Upvote" ADD CONSTRAINT "Upvote_toolId_fkey"
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Favorite" DROP CONSTRAINT IF EXISTS "Favorite_toolId_fkey";
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_toolId_fkey"
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_toolId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_toolId_fkey"
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_parentId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "CustomMetricDefinition" DROP CONSTRAINT IF EXISTS "CustomMetricDefinition_toolId_fkey";
ALTER TABLE "CustomMetricDefinition" ADD CONSTRAINT "CustomMetricDefinition_toolId_fkey"
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MetricEvent" DROP CONSTRAINT IF EXISTS "MetricEvent_toolId_fkey";
ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_toolId_fkey"
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ToolSession" DROP CONSTRAINT IF EXISTS "ToolSession_toolId_fkey";
ALTER TABLE "ToolSession" ADD CONSTRAINT "ToolSession_toolId_fkey"
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Quest" DROP CONSTRAINT IF EXISTS "Quest_toolId_fkey";
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_toolId_fkey"
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GamificationConfig" DROP CONSTRAINT IF EXISTS "GamificationConfig_toolId_fkey";
ALTER TABLE "GamificationConfig" ADD CONSTRAINT "GamificationConfig_toolId_fkey"
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ToolDocument" DROP CONSTRAINT IF EXISTS "ToolDocument_toolId_fkey";
ALTER TABLE "ToolDocument" ADD CONSTRAINT "ToolDocument_toolId_fkey"
  FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ToolDocument" DROP CONSTRAINT IF EXISTS "ToolDocument_sessionId_fkey";
ALTER TABLE "ToolDocument" ADD CONSTRAINT "ToolDocument_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "BuildSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
