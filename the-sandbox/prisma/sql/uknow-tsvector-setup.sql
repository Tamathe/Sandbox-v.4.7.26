-- UKNow Intelligence: Full-text search setup
-- Run after the uknow-intelligence-schema migration

-- 1. Populate tsvector on existing UKNowArticle rows
UPDATE "UKNowArticle" a
SET "tsvector" = to_tsvector('english', a.title || ' ' || COALESCE(
  (SELECT string_agg(c.content, ' ')
   FROM "UKNowChunk" c WHERE c."articleId" = a.id), ''));

-- 2. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_uknow_tsvector ON "UKNowArticle" USING GIN ("tsvector");

-- 3. Auto-update trigger: set tsvector on INSERT or UPDATE of title
CREATE OR REPLACE FUNCTION uknow_article_tsvector_update() RETURNS trigger AS $$
BEGIN
  NEW."tsvector" := to_tsvector('english', NEW.title || ' ' || COALESCE(
    (SELECT string_agg(c.content, ' ')
     FROM "UKNowChunk" c WHERE c."articleId" = NEW.id), ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_uknow_article_tsvector ON "UKNowArticle";
CREATE TRIGGER trg_uknow_article_tsvector
  BEFORE INSERT OR UPDATE OF title ON "UKNowArticle"
  FOR EACH ROW
  EXECUTE FUNCTION uknow_article_tsvector_update();
