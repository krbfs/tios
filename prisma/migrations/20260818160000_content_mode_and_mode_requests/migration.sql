-- ContentMode enum + ModeRequest (REWORK_PLAN §2–3)

CREATE TYPE "ContentMode" AS ENUM (
  'leader_resource',
  'insighter',
  'insighter_you',
  'stressless',
  'hr_table'
);

CREATE TYPE "ModeRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE "test_results" ALTER COLUMN "mode" DROP DEFAULT;
ALTER TABLE "test_results"
  ALTER COLUMN "mode" TYPE "ContentMode" USING ("mode"::"ContentMode");
ALTER TABLE "test_results" ALTER COLUMN "mode" SET DEFAULT 'leader_resource';

ALTER TABLE "content_blocks"
  ALTER COLUMN "mode" TYPE "ContentMode" USING ("mode"::"ContentMode");

CREATE TABLE "mode_requests" (
  "id" TEXT NOT NULL,
  "result_id" TEXT NOT NULL,
  "requested_mode" "ContentMode" NOT NULL,
  "status" "ModeRequestStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  "resolved_by_id" TEXT,
  "admin_note" TEXT,

  CONSTRAINT "mode_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mode_requests_result_id_idx" ON "mode_requests"("result_id");
CREATE INDEX "mode_requests_status_idx" ON "mode_requests"("status");

ALTER TABLE "mode_requests"
  ADD CONSTRAINT "mode_requests_result_id_fkey"
  FOREIGN KEY ("result_id") REFERENCES "test_results"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
