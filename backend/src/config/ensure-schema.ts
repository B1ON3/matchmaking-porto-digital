import { prisma } from './prisma';

// O deploy da Vercel publica o codigo antes de alguem rodar `npm run prisma:deploy`
// no Supabase. Como o recurso novo (editar / apagar so pra mim) depende de colunas
// que ainda podem nao existir no banco de producao, garantimos as colunas de forma
// idempotente no primeiro uso da API de mensagens.
//
// A migration oficial continua em prisma/migrations/...; este guard so evita que
// um deploy sem migration derrube a tela de conversas, e vira no-op quando a
// migration ja foi aplicada (ADD COLUMN IF NOT EXISTS).
const DDL = `
  ALTER TABLE "messages"
    ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "deletedForSender" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "deletedForRecipient" BOOLEAN NOT NULL DEFAULT false
`;

let garantia: Promise<void> | undefined;

export function garantirSchemaDeMensagens(): Promise<void> {
  garantia ??= prisma
    .$executeRawUnsafe(DDL)
    .then(() => undefined)
    .catch((erro: unknown) => {
      // permite tentar de novo numa proxima requisicao
      garantia = undefined;
      throw erro;
    });

  return garantia;
}
