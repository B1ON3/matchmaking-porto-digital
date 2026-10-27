-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "startups"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "document" TEXT,
  ADD COLUMN "targetMarket" TEXT,
  ADD COLUMN "traction" TEXT,
  ADD COLUMN "roundTarget" INTEGER,
  ADD COLUMN "useOfFunds" TEXT,
  ADD COLUMN "competitors" TEXT,
  ADD COLUMN "accelerators" TEXT,
  ADD COLUMN "awards" TEXT,
  ADD COLUMN "instagram" TEXT;

-- AlterTable
ALTER TABLE "investors"
  ADD COLUMN "document" TEXT,
  ADD COLUMN "instagram" TEXT,
  ADD COLUMN "dealsPerYear" INTEGER,
  ADD COLUMN "horizon" TEXT,
  ADD COLUMN "leadsRound" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "boardSeat" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "valueAdd" TEXT;

-- CreateTable
CREATE TABLE "profile_verifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "VerificationStatus" NOT NULL DEFAULT 'PENDENTE',
  "legalName" TEXT,
  "document" TEXT,
  "website" TEXT,
  "linkedin" TEXT,
  "pitchUrl" TEXT,
  "evidence" TEXT NOT NULL,
  "extraLinks" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,

  CONSTRAINT "profile_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_verifiedAt_idx" ON "users"("verifiedAt");

-- CreateIndex
CREATE INDEX "profile_verifications_status_submittedAt_idx" ON "profile_verifications"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "profile_verifications_userId_status_idx" ON "profile_verifications"("userId", "status");

-- AddForeignKey
ALTER TABLE "profile_verifications"
  ADD CONSTRAINT "profile_verifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_verifications"
  ADD CONSTRAINT "profile_verifications_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
