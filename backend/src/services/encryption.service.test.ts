import assert from 'node:assert/strict';
import {
  ENCRYPTED_PREFIX,
  EncryptionError,
  createTextEncryptor,
  getEncryptionKid,
  type EncryptionKeyring,
} from './encryption.service';

const chaveA = Buffer.alloc(32, 1).toString('base64');
const chaveB = Buffer.alloc(32, 2).toString('base64');

const keyring: EncryptionKeyring = {
  activeKid: 'dev-2026-10',
  keys: {
    'dev-2026-10': chaveA,
    'dev-2026-09': chaveB,
  },
};

const encryptor = createTextEncryptor(keyring);

const casos = [
  'mensagem simples',
  'conteúdo com acentuação: ção, ã, é, í, ó, ú',
  'emoji e unicode: 🔒 🚀 你好 مرحبا',
  'linhas\ncom\tquebras e "aspas"',
  'x'.repeat(120_000),
];

for (const original of casos) {
  const cifrado = encryptor.encrypt(original);
  assert.ok(encryptor.isEncrypted(cifrado), 'texto deve começar com o prefixo versionado');
  assert.ok(cifrado.startsWith(ENCRYPTED_PREFIX), 'prefixo deve ser enc:v1:');
  assert.notEqual(cifrado, original);
  assert.equal(encryptor.decrypt(cifrado), original);
}

assert.equal(encryptor.encrypt(''), '');
assert.equal(encryptor.decrypt(''), '');
assert.equal(encryptor.decryptLegacy('texto legado sem ciphertext'), 'texto legado sem ciphertext');
assert.equal(encryptor.isEncrypted('texto legado'), false);

const cifradoComChaveAntiga = encryptor.encrypt('rotacao de chave', 'dev-2026-09');
assert.equal(encryptor.decrypt(cifradoComChaveAntiga), 'rotacao de chave');
assert.equal(getEncryptionKid(cifradoComChaveAntiga), 'dev-2026-09');
assert.equal(getEncryptionKid('texto legado'), null);

const idempotente = encryptor.encryptIfNeeded('conteudo novo');
assert.equal(idempotente.changed, true);
assert.equal(encryptor.encryptIfNeeded(idempotente.value).changed, false);
assert.equal(encryptor.encryptIfNeeded(idempotente.value).value, idempotente.value);

const partes = cifradoComChaveAntiga.split(':');
const tagAdulterada = Buffer.from(partes[4], 'base64url');
tagAdulterada[0] ^= 0xff;
partes[4] = tagAdulterada.toString('base64url');

assert.throws(
  () => encryptor.decrypt(partes.join(':')),
  (erro) => erro instanceof EncryptionError,
  'tag adulterada deve falhar',
);

const outroKeyring = createTextEncryptor({
  activeKid: 'dev-2026-09',
  keys: { 'dev-2026-09': chaveA },
});

assert.throws(
  () => outroKeyring.decrypt(cifradoComChaveAntiga),
  (erro) => erro instanceof EncryptionError,
  'chave errada deve falhar',
);

const keyringSemKid = createTextEncryptor({
  activeKid: 'dev-2026-10',
  keys: { 'dev-2026-10': chaveA },
});

assert.throws(
  () => keyringSemKid.decrypt(cifradoComChaveAntiga),
  (erro) => erro instanceof EncryptionError,
  'kid ausente do keyring deve falhar',
);

assert.deepEqual(encryptor.metadata(), {
  activeKid: 'dev-2026-10',
  kids: ['dev-2026-09', 'dev-2026-10'],
});

assert.throws(
  () => createTextEncryptor({ activeKid: 'dev', keys: { dev: 'curta' } }),
  (erro) => erro instanceof EncryptionError,
  'chave fora do tamanho deve falhar',
);

assert.throws(
  () => createTextEncryptor({ activeKid: 'outra', keys: { dev: chaveA } }),
  (erro) => erro instanceof EncryptionError,
  'kid ativo precisa existir',
);

console.log('encryption: round-trip, legado, adulteracao e keyring passaram');
