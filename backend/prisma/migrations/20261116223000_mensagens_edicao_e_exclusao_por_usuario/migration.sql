-- AlterTable
ALTER TABLE "messages"
  ADD COLUMN "editedAt" TIMESTAMP(3),
  ADD COLUMN "deletedForSender" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedForRecipient" BOOLEAN NOT NULL DEFAULT false;
