-- sep_16: special triad blocks use triad_variant = 'detected' (L2 cascade).

ALTER TABLE "content_blocks"
  DROP CONSTRAINT IF EXISTS "content_blocks_triad_variant_check";

ALTER TABLE "content_blocks"
  ADD CONSTRAINT "content_blocks_triad_variant_check"
  CHECK ("triad_variant" IS NULL OR "triad_variant" IN ('left', 'right', 'detected'));
