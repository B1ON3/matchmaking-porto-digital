import assert from 'node:assert/strict';
import type { ConsentType } from '@prisma/client';
import {
  montarConsentimentosObrigatorios,
  podeRevogar,
  resumoConsentimentos,
  temConsentimentosMinimos,
  versoesDesatualizadas,
  type ConsentLike,
} from './consent.rules';

const policy = { version: '1.0', hash: 'a'.repeat(64) };
const origin = { ip: '127.0.0.1', userAgent: 'teste' };

assert.deepEqual(versoesDesatualizadas({ termsVersion: '1.0', privacyVersion: '1.0' }, '1.0'), []);
assert.deepEqual(versoesDesatualizadas({ termsVersion: '0.9', privacyVersion: '1.0' }, '1.0'), ['termos de uso']);
assert.deepEqual(versoesDesatualizadas({ termsVersion: '0.9', privacyVersion: '0.8' }, '1.0'), [
  'termos de uso',
  'política de privacidade',
]);

const obrigatorios = montarConsentimentosObrigatorios(policy, false, origin);
assert.equal(obrigatorios.length, 2);
assert.equal(obrigatorios[0].type, 'TERMOS_USO');
assert.equal(obrigatorios[1].type, 'DADOS_PESSOAIS');
assert.equal(obrigatorios[0].policyHash, policy.hash);
assert.equal(obrigatorios[0].ip, '127.0.0.1');

const comComunicacoes = montarConsentimentosObrigatorios(policy, true, origin);
assert.equal(comComunicacoes.length, 3);
assert.equal(comComunicacoes[2].type, 'COMUNICACOES');

assert.equal(podeRevogar('COMUNICACOES'), true);
assert.equal(podeRevogar('DADOS_PESSOAIS'), false);

function registro(type: ConsentType, granted: boolean, minutos: number, revokedAt: Date | null = null): ConsentLike {
  return {
    type,
    granted,
    policyVersion: policy.version,
    policyHash: policy.hash,
    acceptedAt: new Date(2026, 9, 26, 12, minutos),
    revokedAt,
  };
}

const historico = [
  registro('DADOS_PESSOAIS', true, 0),
  registro('TERMOS_USO', true, 1),
  registro('COMUNICACOES', true, 2),
  registro('COMUNICACOES', false, 3, new Date(2026, 9, 26, 12, 3)),
];

const resumo = resumoConsentimentos(historico);
assert.equal(resumo.length, 3);
assert.equal(resumo.find((item) => item.type === 'COMUNICACOES')?.status, 'REVOGADO');
assert.equal(temConsentimentosMinimos(resumo), true);

const semDados = resumoConsentimentos([
  registro('TERMOS_USO', true, 0),
  registro('DADOS_PESSOAIS', false, 1, new Date()),
]);
assert.equal(temConsentimentosMinimos(semDados), false);

console.log('consent.rules: todos os testes passaram');
