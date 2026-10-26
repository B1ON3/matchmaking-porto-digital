import type { ConsentType } from '@prisma/client';

export interface PolicyVersions {
  termsVersion: string;
  privacyVersion: string;
}

export interface ConsentInput {
  type: ConsentType;
  granted: boolean;
  policyVersion: string;
  policyHash: string;
  ip: string | null;
  userAgent: string | null;
  revokedAt?: Date | null;
}

export interface ConsentOrigin {
  ip: string | null;
  userAgent: string | null;
}

export interface ConsentLike {
  type: ConsentType;
  granted: boolean;
  policyVersion: string;
  policyHash: string;
  acceptedAt: Date;
  revokedAt?: Date | null;
}

export type ConsentStatus = 'CONCEDIDO' | 'REVOGADO';

export interface ConsentSummary {
  type: ConsentType;
  status: ConsentStatus;
  version: string;
  acceptedAt: Date;
  revokedAt: Date | null;
}

const TIPOS_OBRIGATORIOS: ConsentType[] = ['TERMOS_USO', 'DADOS_PESSOAIS'];

export function versoesDesatualizadas(dados: PolicyVersions, versaoAtual: string): string[] {
  const desatualizadas: string[] = [];

  if (dados.termsVersion !== versaoAtual) {
    desatualizadas.push('termos de uso');
  }

  if (dados.privacyVersion !== versaoAtual) {
    desatualizadas.push('política de privacidade');
  }

  return desatualizadas;
}

export function montarConsentimentosObrigatorios(
  policy: { version: string; hash: string },
  comunicacoes: boolean,
  origin: ConsentOrigin,
): ConsentInput[] {
  const consentimentos: ConsentInput[] = TIPOS_OBRIGATORIOS.map((type) => ({
    type,
    granted: true,
    policyVersion: policy.version,
    policyHash: policy.hash,
    revokedAt: null,
    ...origin,
  }));

  if (comunicacoes) {
    consentimentos.push({
      type: 'COMUNICACOES',
      granted: true,
      policyVersion: policy.version,
      policyHash: policy.hash,
      revokedAt: null,
      ...origin,
    });
  }

  return consentimentos;
}

export function podeRevogar(type: ConsentType): boolean {
  return type === 'COMUNICACOES';
}

export function resumoConsentimentos(registros: ConsentLike[]): ConsentSummary[] {
  const ultimos = new Map<ConsentType, ConsentLike>();

  for (const registro of registros) {
    const anterior = ultimos.get(registro.type);

    if (!anterior || registro.acceptedAt.getTime() > anterior.acceptedAt.getTime()) {
      ultimos.set(registro.type, registro);
    }
  }

  return Array.from(ultimos.values()).map((registro) => ({
    type: registro.type,
    status: registro.granted ? 'CONCEDIDO' : 'REVOGADO',
    version: registro.policyVersion,
    acceptedAt: registro.acceptedAt,
    revokedAt: registro.revokedAt ?? null,
  }));
}

export function temConsentimentosMinimos(registros: ConsentSummary[]): boolean {
  return TIPOS_OBRIGATORIOS.every((tipo) =>
    registros.some((registro) => registro.type === tipo && registro.status === 'CONCEDIDO'),
  );
}
