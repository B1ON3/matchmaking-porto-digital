import { prisma } from '../config/prisma';
import { backfillEncryption } from '../services/encryption-backfill.service';

function lerTamanhoDoLote(): number | undefined {
  const arg = process.argv.find((item) => item.startsWith('--batch='));

  if (!arg) {
    return undefined;
  }

  const valor = Number(arg.slice('--batch='.length));
  return Number.isFinite(valor) && valor > 0 ? valor : undefined;
}

async function main() {
  const summary = await backfillEncryption(prisma, {
    batchSize: lerTamanhoDoLote(),
    dryRun: process.argv.includes('--dry-run'),
    rewrap: process.argv.includes('--rewrap'),
  });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'falha ao executar o backfill de criptografia');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
