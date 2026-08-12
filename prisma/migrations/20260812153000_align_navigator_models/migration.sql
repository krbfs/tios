-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "PsychotypeLevel" AS ENUM ('pure', 'dyad', 'triad');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_uuid" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "test_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "scaled_scores" JSONB,
    "scaled_systemic" JSONB,
    "psychotype_code" TEXT NOT NULL,
    "psychotype_secondary" TEXT,
    "avg_intensity" DOUBLE PRECISION,
    "validation_warnings" JSONB,
    "mode" TEXT NOT NULL DEFAULT 'leader_resource',
    "admin_comment" TEXT,
    "show_admin_comment" BOOLEAN NOT NULL DEFAULT false,
    "visibility_overrides" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "share_token" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_blocks" (
    "id" SERIAL NOT NULL,
    "psychotype_code" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "block_key" TEXT NOT NULL,
    "block_template" TEXT NOT NULL,
    "title" TEXT,
    "content_text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible_default" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" INTEGER NOT NULL,
    "left_text" TEXT NOT NULL,
    "right_text" TEXT NOT NULL,
    "factor_group" TEXT NOT NULL,
    "sub_factor" TEXT,
    "tendency_positive" TEXT,
    "tendency_negative" TEXT,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychotype_definitions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "tendency_1" TEXT NOT NULL,
    "tendency_2" TEXT NOT NULL,
    "level" "PsychotypeLevel" NOT NULL DEFAULT 'pure',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "psychotype_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT,
    "session_uuid" UUID,
    "consent_version" INTEGER NOT NULL,
    "consent_text" TEXT NOT NULL,
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "test_sessions_session_uuid_key" ON "test_sessions"("session_uuid");

-- CreateIndex
CREATE INDEX "test_sessions_user_id_idx" ON "test_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_results_session_id_key" ON "test_results"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_results_share_token_key" ON "test_results"("share_token");

-- CreateIndex
CREATE INDEX "test_results_psychotype_code_idx" ON "test_results"("psychotype_code");

-- CreateIndex
CREATE INDEX "test_results_mode_idx" ON "test_results"("mode");

-- CreateIndex
CREATE INDEX "content_blocks_mode_psychotype_code_is_active_idx" ON "content_blocks"("mode", "psychotype_code", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "content_blocks_psychotype_code_mode_block_key_version_key" ON "content_blocks"("psychotype_code", "mode", "block_key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "psychotype_definitions_code_key" ON "psychotype_definitions"("code");

-- CreateIndex
CREATE INDEX "user_consents_user_id_idx" ON "user_consents"("user_id");

-- CreateIndex
CREATE INDEX "user_consents_session_uuid_idx" ON "user_consents"("session_uuid");

-- AddForeignKey
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "test_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

