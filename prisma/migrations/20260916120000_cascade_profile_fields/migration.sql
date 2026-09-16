-- sep_16: каскадный профиль (уровни 1–5)
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "primary_type" TEXT;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "secondary_type" TEXT;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "profile_complexity" VARCHAR(24);
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "cascade_level_used" INTEGER;
ALTER TABLE "test_results" ADD COLUMN IF NOT EXISTS "cluster_tendencies" JSONB;
