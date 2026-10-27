import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './database-url';
import { env } from './env';

export const prisma = new PrismaClient({
  datasourceUrl: resolveDatabaseUrl(env.databaseUrl, Boolean(process.env.VERCEL)),
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
