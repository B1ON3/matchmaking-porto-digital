-- CreateEnum
CREATE TYPE "TrustStatus" AS ENUM ('NAO_AVALIADO', 'CONFIAVEL', 'SUSPEITO', 'GOLPE');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('GOLPE', 'PERFIL_FALSO', 'ASSEDIO', 'SPAM', 'DADOS_INCORRETOS', 'SUPORTE', 'OUTRO');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ABERTO', 'EM_ANALISE', 'AGUARDANDO_USUARIO', 'RESOLVIDO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "TicketActionType" AS ENUM (
  'ACESSO_AUTORIZADO',
  'OBSERVACAO',
  'USUARIO_SUSPENSO',
  'USUARIO_REATIVADO',
  'PERFIL_OCULTADO',
  'PERFIL_RESTAURADO',
  'GOLPE_CONFIRMADO',
  'GOLPE_DESCARTADO',
  'SUSPEITA_MARCADA',
  'SUSPEITA_REMOVIDA'
);

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "trustStatus" "TrustStatus" NOT NULL DEFAULT 'NAO_AVALIADO',
  ADD COLUMN "trustReason" TEXT,
  ADD COLUMN "trustUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "startups"
  ADD COLUMN "businessModel" TEXT,
  ADD COLUMN "teamSize" INTEGER,
  ADD COLUMN "revenue" TEXT,
  ADD COLUMN "linkedin" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "phone" TEXT;

-- AlterTable
ALTER TABLE "investors"
  ADD COLUMN "investorType" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "linkedin" TEXT,
  ADD COLUMN "investmentThesis" TEXT,
  ADD COLUMN "preferredGeography" TEXT,
  ADD COLUMN "portfolioUrl" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "experience" TEXT;

-- CreateTable
CREATE TABLE "tickets" (
  "id" TEXT NOT NULL,
  "protocol" TEXT NOT NULL,
  "category" "TicketCategory" NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'ABERTO',
  "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
  "resolution" TEXT,
  "reporterId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_actions" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" "TicketActionType" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ticket_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_protocol_key" ON "tickets"("protocol");

-- CreateIndex
CREATE INDEX "tickets_status_createdAt_idx" ON "tickets"("status", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_reporterId_createdAt_idx" ON "tickets"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_targetUserId_idx" ON "tickets"("targetUserId");

-- CreateIndex
CREATE INDEX "ticket_messages_ticketId_createdAt_idx" ON "ticket_messages"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ticket_messages_senderId_readAt_idx" ON "ticket_messages"("senderId", "readAt");

-- CreateIndex
CREATE INDEX "ticket_actions_ticketId_createdAt_idx" ON "ticket_actions"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "users_trustStatus_idx" ON "users"("trustStatus");

-- AddForeignKey
ALTER TABLE "tickets"
  ADD CONSTRAINT "tickets_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"
  ADD CONSTRAINT "tickets_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages"
  ADD CONSTRAINT "ticket_messages_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages"
  ADD CONSTRAINT "ticket_messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_actions"
  ADD CONSTRAINT "ticket_actions_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_actions"
  ADD CONSTRAINT "ticket_actions_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
