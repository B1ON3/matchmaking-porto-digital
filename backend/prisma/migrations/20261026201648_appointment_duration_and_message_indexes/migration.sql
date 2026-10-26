-- DropIndex
DROP INDEX "appointments_matchId_idx";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 60;

-- CreateIndex
CREATE INDEX "appointments_scheduledAt_durationMinutes_idx" ON "appointments"("scheduledAt", "durationMinutes");

-- CreateIndex
CREATE INDEX "appointments_matchId_scheduledAt_idx" ON "appointments"("matchId", "scheduledAt");

-- CreateIndex
CREATE INDEX "messages_senderId_createdAt_idx" ON "messages"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_recipientId_readAt_idx" ON "messages"("recipientId", "readAt");
