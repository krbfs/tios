-- hr_table compatibility_rules + ModeRequest.userId

ALTER TABLE "mode_requests" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

CREATE INDEX IF NOT EXISTS "mode_requests_user_id_idx" ON "mode_requests"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mode_requests_user_id_fkey'
  ) THEN
    ALTER TABLE "mode_requests"
      ADD CONSTRAINT "mode_requests_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "compatibility_rules" (
  "id" SERIAL NOT NULL,
  "type_a_code" TEXT NOT NULL,
  "type_b_code" TEXT NOT NULL,
  "compatibility_level" TEXT NOT NULL,
  "complement_zone" TEXT,
  "common_zone" TEXT,
  "intensity_note" TEXT,
  "recommendation" TEXT,
  CONSTRAINT "compatibility_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "compatibility_rules_type_a_code_type_b_code_key"
  ON "compatibility_rules"("type_a_code", "type_b_code");

CREATE INDEX IF NOT EXISTS "compatibility_rules_type_a_code_idx"
  ON "compatibility_rules"("type_a_code");

CREATE INDEX IF NOT EXISTS "compatibility_rules_type_b_code_idx"
  ON "compatibility_rules"("type_b_code");
