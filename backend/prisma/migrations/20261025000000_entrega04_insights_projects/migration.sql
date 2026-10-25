-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANEJADO', 'EM_ANDAMENTO', 'CONCLUIDO');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "matchId" TEXT;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "details" JSONB;

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_startupId_idx" ON "projects"("startupId");

-- CreateIndex
CREATE INDEX "appointments_matchId_idx" ON "appointments"("matchId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
