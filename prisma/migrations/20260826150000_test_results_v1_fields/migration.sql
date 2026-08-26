-- V1 (NAVIGATOR 10.0): triad_variant + Empath sub-indices on test_results;
-- allow PsychotypeLevel = complex for definitions.

ALTER TYPE "PsychotypeLevel" ADD VALUE IF NOT EXISTS 'complex';

ALTER TABLE "test_results"
  ADD COLUMN IF NOT EXISTS "triad_variant" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "sub_index_s" INTEGER,
  ADD COLUMN IF NOT EXISTS "sub_index_n" INTEGER;

ALTER TABLE "test_results"
  DROP CONSTRAINT IF EXISTS "test_results_triad_variant_check";

ALTER TABLE "test_results"
  ADD CONSTRAINT "test_results_triad_variant_check"
  CHECK ("triad_variant" IS NULL OR "triad_variant" IN ('left', 'right'));
