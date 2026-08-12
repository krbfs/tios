-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "PsychotypeLevel" AS ENUM ('pure', 'dyad', 'triad');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "microsoftId" TEXT,
    "ssoProvider" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionUuid" UUID NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answers" JSONB NOT NULL,
    "scaledScores" JSONB,
    "scaledSys" JSONB,
    "psychotypeCode" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'leader_resource',
    "validationWarning" TEXT,
    "avgTimePerQuestion" DOUBLE PRECISION,
    "fastAnswersCount" INTEGER NOT NULL DEFAULT 0,
    "adminComment" TEXT,
    "showAdminComment" BOOLEAN NOT NULL DEFAULT false,
    "visibilitySettings" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" UUID,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" INTEGER NOT NULL,
    "leftText" TEXT NOT NULL,
    "rightText" TEXT NOT NULL,
    "factorGroup" TEXT NOT NULL,
    "subFactor" TEXT,
    "tendencyPositive" TEXT,
    "tendencyNegative" TEXT,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_blocks" (
    "id" SERIAL NOT NULL,
    "psychotypeCode" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "blockKey" TEXT NOT NULL,
    "blockTemplate" TEXT NOT NULL,
    "title" TEXT,
    "contentText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisibleDefault" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psychotype_definitions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "tendency1" TEXT NOT NULL,
    "tendency2" TEXT NOT NULL,
    "level" "PsychotypeLevel" NOT NULL DEFAULT 'pure',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "psychotype_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "sessionUuid" UUID,
    "consentVersion" INTEGER NOT NULL,
    "consentText" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_microsoftId_key" ON "users"("microsoftId");

-- CreateIndex
CREATE UNIQUE INDEX "test_results_sessionUuid_key" ON "test_results"("sessionUuid");

-- CreateIndex
CREATE UNIQUE INDEX "test_results_shareToken_key" ON "test_results"("shareToken");

-- CreateIndex
CREATE INDEX "test_results_userId_idx" ON "test_results"("userId");

-- CreateIndex
CREATE INDEX "test_results_mode_idx" ON "test_results"("mode");

-- CreateIndex
CREATE INDEX "content_blocks_mode_psychotypeCode_isActive_idx" ON "content_blocks"("mode", "psychotypeCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "content_blocks_psychotypeCode_mode_blockKey_version_key" ON "content_blocks"("psychotypeCode", "mode", "blockKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "psychotype_definitions_code_key" ON "psychotype_definitions"("code");

-- CreateIndex
CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");

-- CreateIndex
CREATE INDEX "user_consents_sessionUuid_idx" ON "user_consents"("sessionUuid");

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
