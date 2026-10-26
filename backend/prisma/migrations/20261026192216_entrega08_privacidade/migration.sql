-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ATIVO', 'SUSPENSO', 'EXCLUIDO');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMOS_USO', 'DADOS_PESSOAIS', 'COMUNICACOES');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ATIVO',
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "policyHash" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_records_userId_type_acceptedAt_idx" ON "consent_records"("userId", "type", "acceptedAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
