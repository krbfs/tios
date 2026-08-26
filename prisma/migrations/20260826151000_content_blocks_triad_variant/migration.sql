-- V1: triad_variant on content_blocks; uniqueness includes triad_variant.
-- NULLS NOT DISTINCT so base blocks (triad_variant IS NULL) stay unique.

ALTER TABLE "content_blocks"
  ADD COLUMN IF NOT EXISTS "triad_variant" VARCHAR(10);

ALTER TABLE "content_blocks"
  DROP CONSTRAINT IF EXISTS "content_blocks_triad_variant_check";

ALTER TABLE "content_blocks"
  ADD CONSTRAINT "content_blocks_triad_variant_check"
  CHECK ("triad_variant" IS NULL OR "triad_variant" IN ('left', 'right'));

ALTER TABLE "content_blocks"
  DROP CONSTRAINT IF EXISTS "content_blocks_psychotype_code_mode_block_key_version_key";

DROP INDEX IF EXISTS "content_blocks_psychotype_code_mode_block_key_version_key";
DROP INDEX IF EXISTS "content_blocks_psychotype_code_mode_block_key_triad_variant_version_key";

CREATE UNIQUE INDEX "content_blocks_psychotype_code_mode_block_key_triad_variant_version_key"
  ON "content_blocks" ("psychotype_code", "mode", "block_key", "triad_variant", "version")
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS "content_blocks_psychotype_code_mode_triad_variant_idx"
  ON "content_blocks" ("psychotype_code", "mode", "triad_variant");
