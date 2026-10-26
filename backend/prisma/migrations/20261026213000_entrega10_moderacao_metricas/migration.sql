-- AlterTable
ALTER TABLE "startups" ADD COLUMN     "hiddenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "investors" ADD COLUMN     "hiddenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "startups_hiddenAt_idx" ON "startups"("hiddenAt");

-- CreateIndex
CREATE INDEX "investors_hiddenAt_idx" ON "investors"("hiddenAt");

-- CreateIndex
CREATE INDEX "users_lastLoginAt_idx" ON "users"("lastLoginAt");
