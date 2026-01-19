-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('DISCORD', 'TELEGRAM', 'EMAIL', 'NONE');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('ARB', 'MIDDLE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PaperPositionStatus" AS ENUM ('OPEN', 'CLOSED', 'MISSED', 'EDGE_LOST');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'NONE',
    "discordWebhook" TEXT,
    "telegramBotToken" TEXT,
    "telegramChatId" TEXT,
    "emailTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minEdge" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "minMiddleWidth" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "stakeDefault" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "sportsSelection" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "marketsSelection" TEXT[] DEFAULT ARRAY['h2h', 'totals', 'spreads']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannerSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "sportKey" TEXT NOT NULL,
    "sportTitle" TEXT,
    "commenceTime" TIMESTAMP(3) NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "marketKey" TEXT NOT NULL,
    "edgePct" DOUBLE PRECISION NOT NULL,
    "middleWidth" DOUBLE PRECISION,
    "legs" JSONB NOT NULL,
    "raw" JSONB,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityDelivery" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bankroll" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "maxOpen" INTEGER NOT NULL DEFAULT 5,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "autoFill" BOOLEAN NOT NULL DEFAULT false,
    "latencyMsMin" INTEGER NOT NULL DEFAULT 400,
    "latencyMsMax" INTEGER NOT NULL DEFAULT 2200,
    "slippageBps" INTEGER NOT NULL DEFAULT 35,
    "missFillProb" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "maxLegOddsWorsen" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "fillEvenIfEdgeLost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "type" "OpportunityType" NOT NULL,
    "eventId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "stakeTotal" DOUBLE PRECISION NOT NULL,
    "edgePct" DOUBLE PRECISION NOT NULL,
    "status" "PaperPositionStatus" NOT NULL,
    "legs" JSONB NOT NULL,
    "notes" TEXT,
    "payout" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "slippageApplied" JSONB,

    CONSTRAINT "PaperPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerHeartbeat" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScanAt" TIMESTAMP(3) NOT NULL,
    "polls" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "apiCalls" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_userId_key" ON "NotificationSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScannerSetting_userId_key" ON "ScannerSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_fingerprint_key" ON "Opportunity"("fingerprint");

-- CreateIndex
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");

-- CreateIndex
CREATE INDEX "Opportunity_sportKey_idx" ON "Opportunity"("sportKey");

-- CreateIndex
CREATE INDEX "Opportunity_type_idx" ON "Opportunity"("type");

-- CreateIndex
CREATE INDEX "Opportunity_eventId_idx" ON "Opportunity"("eventId");

-- CreateIndex
CREATE INDEX "OpportunityDelivery_opportunityId_idx" ON "OpportunityDelivery"("opportunityId");

-- CreateIndex
CREATE INDEX "OpportunityDelivery_userId_idx" ON "OpportunityDelivery"("userId");

-- CreateIndex
CREATE INDEX "OpportunityDelivery_createdAt_idx" ON "OpportunityDelivery"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaperAccount_userId_key" ON "PaperAccount"("userId");

-- CreateIndex
CREATE INDEX "PaperPosition_userId_idx" ON "PaperPosition"("userId");

-- CreateIndex
CREATE INDEX "PaperPosition_status_idx" ON "PaperPosition"("status");

-- CreateIndex
CREATE INDEX "PaperPosition_createdAt_idx" ON "PaperPosition"("createdAt");

-- CreateIndex
CREATE INDEX "WorkerHeartbeat_createdAt_idx" ON "WorkerHeartbeat"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSetting" ADD CONSTRAINT "NotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerSetting" ADD CONSTRAINT "ScannerSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityDelivery" ADD CONSTRAINT "OpportunityDelivery_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityDelivery" ADD CONSTRAINT "OpportunityDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAccount" ADD CONSTRAINT "PaperAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperPosition" ADD CONSTRAINT "PaperPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
