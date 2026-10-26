import assert from 'node:assert/strict';
import { getPrivacyPolicy, PRIVACY_POLICY_HASH } from './privacy-policy';

const policy = getPrivacyPolicy();

assert.match(policy.version, /^\d+\.\d+$/);
assert.match(policy.effectiveAt, /^\d{4}-\d{2}-\d{2}$/);
assert.match(policy.hash, /^[a-f0-9]{64}$/);
assert.equal(policy.hash, PRIVACY_POLICY_HASH);
assert.equal(policy.sections.length >= 10, true);

const ids = policy.sections.map((section) => section.id);
assert.equal(new Set(ids).size, ids.length, 'ids das seções não podem repetir');

for (const obrigatoria of ['dados-coletados', 'finalidades-bases', 'direitos', 'seguranca', 'contato']) {
  assert.equal(ids.includes(obrigatoria), true, `seção obrigatória ausente: ${obrigatoria}`);
}

const texto = policy.sections
  .flatMap((section) => [section.title, ...section.paragraphs, ...(section.items ?? [])])
  .join(' ')
  .toLowerCase();

for (const termo of ['lgpd', 'consentimento', 'portabilidade', 'exclusão', 'aes-256-gcm']) {
  assert.equal(texto.includes(termo), true, `termo ausente na política: ${termo}`);
}

console.log('privacy-policy: todos os testes passaram');
