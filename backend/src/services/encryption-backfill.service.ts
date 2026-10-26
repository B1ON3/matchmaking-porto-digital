import type { PrismaClient } from '@prisma/client';
import {
  ENCRYPTED_PREFIX,
  decryptText,
  encryptText,
  getEncryptionKid,
  isEncrypted,
  validateEncryptionConfig,
} from './encryption.service';

type BackfillDb = Pick<PrismaClient, 'appointment' | 'auditLog' | 'message'>;

export interface BackfillOptions {
  batchSize?: number;
  dryRun?: boolean;
  rewrap?: boolean;
}

export interface BackfillCollectionResult {
  scanned: number;
  migrated: number;
  failed: number;
}

export interface BackfillSummary {
  dryRun: boolean;
  rewrap: boolean;
  batchSize: number;
  total: number;
  messages: BackfillCollectionResult;
  appointments: BackfillCollectionResult;
  auditLogs: BackfillCollectionResult;
}

interface BackfillContext {
  activeKid: string;
  batchSize: number;
  dryRun: boolean;
  rewrap: boolean;
}

function precisaTransformar(value: string, context: BackfillContext): boolean {
  if (!isEncrypted(value)) {
    return true;
  }

  return context.rewrap && getEncryptionKid(value) !== context.activeKid;
}

function transformar(value: string): string {
  return encryptText(isEncrypted(value) ? decryptText(value) : value);
}

function resultadoVazio(): BackfillCollectionResult {
  return { scanned: 0, migrated: 0, failed: 0 };
}

function registrarFalha(resultado: BackfillCollectionResult, colecao: string, id: string, error: unknown): void {
  resultado.failed += 1;
  const motivo = error instanceof Error ? error.message : 'erro desconhecido';
  process.stderr.write(`falha ao cifrar registro ${JSON.stringify({ colecao, id, motivo })}\n`);
}

async function backfillMessages(
  db: BackfillDb,
  context: BackfillContext,
  resultado: BackfillCollectionResult,
): Promise<void> {
  let cursor: string | undefined;

  for (;;) {
    const mensagens = await db.message.findMany({
      where: {
        content: { not: '' },
        ...(context.rewrap ? {} : { NOT: { content: { startsWith: ENCRYPTED_PREFIX } } }),
      },
      select: { id: true, content: true },
      orderBy: { id: 'asc' },
      take: context.batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (mensagens.length === 0) {
      return;
    }

    for (const mensagem of mensagens) {
      if (!precisaTransformar(mensagem.content, context)) {
        continue;
      }

      resultado.scanned += 1;

      if (context.dryRun) {
        resultado.migrated += 1;
        continue;
      }

      try {
        await db.message.update({
          where: { id: mensagem.id },
          data: { content: transformar(mensagem.content) },
        });
        resultado.migrated += 1;
      } catch (error) {
        registrarFalha(resultado, 'messages', mensagem.id, error);
      }
    }

    cursor = mensagens[mensagens.length - 1].id;
  }
}

async function backfillAppointments(
  db: BackfillDb,
  context: BackfillContext,
  resultado: BackfillCollectionResult,
): Promise<void> {
  let cursor: string | undefined;

  for (;;) {
    const agendamentos = await db.appointment.findMany({
      where: {
        description: { not: null },
        ...(context.rewrap ? {} : { NOT: { description: { startsWith: ENCRYPTED_PREFIX } } }),
      },
      select: { id: true, description: true },
      orderBy: { id: 'asc' },
      take: context.batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (agendamentos.length === 0) {
      return;
    }

    for (const agendamento of agendamentos) {
      if (!agendamento.description || !precisaTransformar(agendamento.description, context)) {
        continue;
      }

      resultado.scanned += 1;

      if (context.dryRun) {
        resultado.migrated += 1;
        continue;
      }

      try {
        await db.appointment.update({
          where: { id: agendamento.id },
          data: { description: transformar(agendamento.description) },
        });
        resultado.migrated += 1;
      } catch (error) {
        registrarFalha(resultado, 'appointments', agendamento.id, error);
      }
    }

    cursor = agendamentos[agendamentos.length - 1].id;
  }
}

async function backfillAuditLogs(
  db: BackfillDb,
  context: BackfillContext,
  resultado: BackfillCollectionResult,
): Promise<void> {
  let cursor: string | undefined;

  for (;;) {
    const logs = await db.auditLog.findMany({
      where: context.rewrap
        ? { OR: [{ details: { not: null } }, { ip: { not: null } }, { userAgent: { not: null } }] }
        : {
            OR: [
              { details: { not: null }, NOT: { details: { startsWith: ENCRYPTED_PREFIX } } },
              { ip: { not: null }, NOT: { ip: { startsWith: ENCRYPTED_PREFIX } } },
              { userAgent: { not: null }, NOT: { userAgent: { startsWith: ENCRYPTED_PREFIX } } },
            ],
          },
      select: { id: true, details: true, ip: true, userAgent: true },
      orderBy: { id: 'asc' },
      take: context.batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (logs.length === 0) {
      return;
    }

    for (const log of logs) {
      const data: { details?: string; ip?: string; userAgent?: string } = {};

      if (log.details && precisaTransformar(log.details, context)) {
        data.details = transformar(log.details);
      }

      if (log.ip && precisaTransformar(log.ip, context)) {
        data.ip = transformar(log.ip);
      }

      if (log.userAgent && precisaTransformar(log.userAgent, context)) {
        data.userAgent = transformar(log.userAgent);
      }

      if (Object.keys(data).length === 0) {
        continue;
      }

      resultado.scanned += 1;

      if (context.dryRun) {
        resultado.migrated += 1;
        continue;
      }

      try {
        await db.auditLog.update({ where: { id: log.id }, data });
        resultado.migrated += 1;
      } catch (error) {
        registrarFalha(resultado, 'auditLogs', log.id, error);
      }
    }

    cursor = logs[logs.length - 1].id;
  }
}

export async function backfillEncryption(db: BackfillDb, options: BackfillOptions = {}): Promise<BackfillSummary> {
  const encryption = validateEncryptionConfig();
  const context: BackfillContext = {
    activeKid: encryption.activeKid,
    batchSize: Math.max(1, Math.min(options.batchSize ?? 100, 1000)),
    dryRun: options.dryRun ?? false,
    rewrap: options.rewrap ?? false,
  };
  const messages = resultadoVazio();
  const appointments = resultadoVazio();
  const auditLogs = resultadoVazio();

  await backfillMessages(db, context, messages);
  await backfillAppointments(db, context, appointments);
  await backfillAuditLogs(db, context, auditLogs);

  return {
    dryRun: context.dryRun,
    rewrap: context.rewrap,
    batchSize: context.batchSize,
    total: messages.migrated + appointments.migrated + auditLogs.migrated,
    messages,
    appointments,
    auditLogs,
  };
}
