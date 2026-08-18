-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('captain', 'member');

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT,
    "invitation_email" TEXT,
    "invitation_token" UUID,
    "joined_at" TIMESTAMP(3),
    "role" "TeamMemberRole" NOT NULL DEFAULT 'member',

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_result_entries" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "result_id" TEXT NOT NULL,
    "label" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_result_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_results" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "compatibility_report" JSONB,
    "leader_candidates" JSONB,
    "admin_comment" TEXT,
    "show_admin_comment" BOOLEAN NOT NULL DEFAULT false,
    "visibility_settings" JSONB,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teams_created_by_id_idx" ON "teams"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_invitation_token_key" ON "team_members"("invitation_token");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_result_entries_team_id_result_id_key" ON "team_result_entries"("team_id", "result_id");

-- CreateIndex
CREATE INDEX "team_result_entries_team_id_idx" ON "team_result_entries"("team_id");

-- CreateIndex
CREATE INDEX "team_result_entries_result_id_idx" ON "team_result_entries"("result_id");

-- CreateIndex
CREATE INDEX "team_results_team_id_idx" ON "team_results"("team_id");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_result_entries" ADD CONSTRAINT "team_result_entries_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_result_entries" ADD CONSTRAINT "team_result_entries_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "test_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_results" ADD CONSTRAINT "team_results_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
