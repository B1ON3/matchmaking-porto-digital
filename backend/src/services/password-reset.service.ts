import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';
import { hashPassword } from '../utils/password';

const TOKEN_BYTES = 32;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SolicitacaoReset {
  token: string;
  expiraEm: Date;
  nome: string;
}

// gera um token de uso unico e guarda apenas o hash. tokens anteriores nao
// usados sao descartados para nao acumular codigos validos na conta.
export async function solicitarRedefinicao(email: string): Promise<SolicitacaoReset | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  if (!user) {
    return null;
  }

  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const expiraEm = new Date(Date.now() + env.passwordResetExpiresMinutes * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { tokenHash: hashToken(token), userId: user.id, expiresAt: expiraEm },
    }),
  ]);

  return { token, expiraEm, nome: user.name };
}

export async function redefinirSenha(token: string, password: string): Promise<void> {
  const registro = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });

  if (!registro || registro.usedAt || registro.expiresAt <= new Date()) {
    throw HttpError.badRequest('codigo invalido ou expirado. Solicite um novo.');
  }

  const passwordHash = await hashPassword(password);
  const agora = new Date();

  await prisma.$transaction([
    prisma.user.update({ where: { id: registro.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: registro.id }, data: { usedAt: agora } }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: registro.userId, id: { not: registro.id } },
    }),
  ]);
}
