import { randomUUID } from 'node:crypto';
import type { ConsentType } from '@prisma/client';
import { getPrivacyPolicy } from '../content/privacy-policy';
import {
  listByUser as listarConsentimentos,
  createMany as criarConsentimentos,
} from '../repositories/consent.repository';
import {
  anonymizeAccount,
  countMatches,
  findExportData,
  findPasswordHash,
  findPrivacyOverview,
} from '../repositories/privacy.repository';
import { comparePassword, hashPassword } from '../utils/password';
import { HttpError } from '../utils/http-error';
import type { RequestContext } from '../utils/request-context';
import {
  montarConsentimentosObrigatorios,
  podeRevogar,
  resumoConsentimentos,
  versoesDesatualizadas,
  type ConsentInput,
  type ConsentSummary,
} from './consent.rules';

interface SignupPrivacyInput {
  termsVersion: string;
  privacyVersion: string;
  communicationsOptIn: boolean;
}

interface ConsentInputRequest {
  type: ConsentType;
  granted: boolean;
}

export function policyPayload() {
  return getPrivacyPolicy();
}

export function consentimentosDeCadastro(dados: SignupPrivacyInput, context: RequestContext): ConsentInput[] {
  const policy = getPrivacyPolicy();
  const desatualizadas = versoesDesatualizadas(dados, policy.version);

  if (desatualizadas.length > 0) {
    throw HttpError.conflict('A versão da política mudou. Leia e aceite novamente antes de continuar.', {
      currentVersion: policy.version,
      currentHash: policy.hash,
      effectiveAt: policy.effectiveAt,
      outdated: desatualizadas,
    });
  }

  return montarConsentimentosObrigatorios(
    { version: policy.version, hash: policy.hash },
    dados.communicationsOptIn,
    context,
  );
}

export async function obterCentralDePrivacidade(userId: string) {
  const [user, registros, matches] = await Promise.all([
    findPrivacyOverview(userId),
    listarConsentimentos(userId),
    countMatches(userId),
  ]);

  if (!user) {
    throw HttpError.notFound('usuario nao encontrado');
  }

  const policy = getPrivacyPolicy();
  const resumo = resumoConsentimentos(registros);

  return {
    policy: {
      version: policy.version,
      hash: policy.hash,
      effectiveAt: policy.effectiveAt,
      reviewDueAt: policy.reviewDueAt,
      title: policy.title,
      contact: policy.contact,
    },
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    consents: resumo,
    history: registros,
    dataSummary: {
      messages: user._count.sentMessages + user._count.receivedMessages,
      appointments: user._count.appointmentsMade,
      matches,
      auditEvents: user._count.auditLogs,
    },
  };
}

export async function registrarConsentimento(
  userId: string,
  entrada: ConsentInputRequest,
  context: RequestContext,
): Promise<ConsentSummary> {
  const policy = getPrivacyPolicy();
  const historico = await listarConsentimentos(userId);
  const atual = resumoConsentimentos(historico).find((registro) => registro.type === entrada.type);

  if (!entrada.granted && !podeRevogar(entrada.type)) {
    throw HttpError.badRequest(
      'Termos de uso e tratamento de dados são condições da conta. Para encerrar o tratamento, solicite a exclusão.',
    );
  }

  if (!entrada.granted && (!atual || atual.status === 'REVOGADO')) {
    throw HttpError.conflict('Não existe consentimento ativo desse tipo para revogar.');
  }

  const agora = new Date();

  await criarConsentimentos(userId, [
    {
      type: entrada.type,
      granted: entrada.granted,
      policyVersion: policy.version,
      policyHash: policy.hash,
      ip: context.ip,
      userAgent: context.userAgent,
      revokedAt: entrada.granted ? null : agora,
    },
  ]);

  return {
    type: entrada.type,
    status: entrada.granted ? 'CONCEDIDO' : 'REVOGADO',
    version: policy.version,
    acceptedAt: agora,
    revokedAt: entrada.granted ? null : agora,
  };
}

export async function exportarDados(userId: string) {
  const [dados, registros] = await Promise.all([findExportData(userId), listarConsentimentos(userId)]);

  if (!dados) {
    throw HttpError.notFound('usuario nao encontrado');
  }

  const policy = getPrivacyPolicy();

  return {
    documento: 'portabilidade-lgpd',
    geradoEm: new Date().toISOString(),
    politica: {
      version: policy.version,
      hash: policy.hash,
      effectiveAt: policy.effectiveAt,
    },
    titular: dados,
    consentimentosAtuais: resumoConsentimentos(registros),
  };
}

export async function excluirConta(userId: string, password: string, context: RequestContext) {
  const user = await findPrivacyOverview(userId);

  if (!user) {
    throw HttpError.notFound('usuario nao encontrado');
  }

  if (user.status !== 'ATIVO') {
    throw HttpError.forbidden('Esta conta não está ativa.');
  }

  const senhaHash = await findPasswordHash(userId);

  if (!senhaHash) {
    throw HttpError.notFound('usuario nao encontrado');
  }

  const senhaConfere = await comparePassword(password, senhaHash);

  if (!senhaConfere) {
    throw HttpError.unauthorized('Senha incorreta. A conta não foi excluída.');
  }

  const resultado = await anonymizeAccount({
    userId,
    passwordHash: await hashPassword(randomUUID()),
    context,
  });

  return {
    mensagem: 'Conta excluída. Dados pessoais foram removidos ou anonimizados.',
    ...resultado,
  };
}
