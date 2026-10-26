import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env';

export const ENCRYPTED_PREFIX = 'enc:v1:';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const KID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface EncryptionKeyring {
  activeKid: string;
  keys: Record<string, string>;
}

export interface EncryptionMetadata {
  activeKid: string;
  kids: string[];
}

// status publico (sem segredos) para o /health e para o boot: na Vercel os logs
// da funcao nao ficam acessiveis, entao a propria API informa o que falta
export type StatusDoKeyring =
  { configurada: true; kidAtivo: string; kids: number } | { configurada: false; variavel: string };

export interface EncryptIfNeededResult {
  value: string;
  changed: boolean;
}

export interface TextEncryptor {
  activeKid: string;
  encrypt: (value: string, kid?: string) => string;
  decrypt: (value: string) => string;
  decryptLegacy: (value: string) => string;
  isEncrypted: (value: string) => boolean;
  encryptIfNeeded: (value: string) => EncryptIfNeededResult;
  metadata: () => EncryptionMetadata;
}

export class EncryptionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'EncryptionError';
  }
}

function aad(kid: string): Buffer {
  return Buffer.from(`laco:${ENCRYPTED_PREFIX}${kid}`, 'utf8');
}

function decodeKey(kid: string, encoded: string): Buffer {
  const value = encoded.trim();

  if (!BASE64_PATTERN.test(value)) {
    throw new EncryptionError(`A chave "${kid}" não está em base64 válido.`);
  }

  const key = Buffer.from(value, 'base64');

  if (key.length !== KEY_BYTES) {
    throw new EncryptionError(`A chave "${kid}" deve ter ${KEY_BYTES} bytes (AES-256).`);
  }

  return key;
}

function decodePart(value: string, expectedBytes?: number): Buffer {
  if (!BASE64URL_PATTERN.test(value)) {
    throw new EncryptionError('Conteúdo cifrado em formato inválido.');
  }

  const buffer = Buffer.from(value, 'base64url');

  if (buffer.length === 0 || (expectedBytes !== undefined && buffer.length !== expectedBytes)) {
    throw new EncryptionError('Conteúdo cifrado em formato inválido.');
  }

  return buffer;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function getEncryptionKid(value: string): string | null {
  if (!isEncrypted(value)) {
    return null;
  }

  const parts = value.split(':');
  return parts.length >= 3 && parts[2] ? parts[2] : null;
}

export function createTextEncryptor(config: EncryptionKeyring): TextEncryptor {
  const activeKid = config.activeKid.trim();

  if (!KID_PATTERN.test(activeKid)) {
    throw new EncryptionError('DATA_ENCRYPTION_ACTIVE_KID inválido.');
  }

  const keys = new Map<string, Buffer>();

  for (const [kid, encoded] of Object.entries(config.keys)) {
    if (!KID_PATTERN.test(kid)) {
      throw new EncryptionError(`O kid "${kid}" é inválido.`);
    }

    if (keys.has(kid)) {
      throw new EncryptionError(`O kid "${kid}" está duplicado.`);
    }

    keys.set(kid, decodeKey(kid, encoded));
  }

  if (!keys.has(activeKid)) {
    throw new EncryptionError('DATA_ENCRYPTION_ACTIVE_KID não existe no keyring configurado.');
  }

  function encrypt(value: string, kid = activeKid): string {
    if (value === '') {
      return '';
    }

    const key = keys.get(kid);

    if (!key) {
      throw new EncryptionError(`Chave ativa "${kid}" não encontrada no keyring.`);
    }

    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(aad(kid));

    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
      'enc',
      'v1',
      kid,
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':');
  }

  function decrypt(value: string): string {
    if (value === '') {
      return '';
    }

    if (!isEncrypted(value)) {
      return value;
    }

    const parts = value.split(':');

    if (parts.length !== 6 || parts[0] !== 'enc' || parts[1] !== 'v1') {
      throw new EncryptionError('Conteúdo cifrado em formato inválido.');
    }

    const kid = parts[2];
    const key = keys.get(kid);

    if (!key) {
      throw new EncryptionError('Chave de criptografia indisponível para este conteúdo.');
    }

    const iv = decodePart(parts[3], IV_BYTES);
    const tag = decodePart(parts[4], TAG_BYTES);
    const ciphertext = decodePart(parts[5]);

    try {
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAAD(aad(kid));
      decipher.setAuthTag(tag);

      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch (error) {
      throw new EncryptionError('Não foi possível decifrar o conteúdo.', { cause: error });
    }
  }

  function encryptIfNeeded(value: string): EncryptIfNeededResult {
    if (isEncrypted(value)) {
      return { value, changed: false };
    }

    return { value: encrypt(value), changed: true };
  }

  return {
    activeKid,
    encrypt,
    decrypt,
    decryptLegacy: decrypt,
    isEncrypted,
    encryptIfNeeded,
    metadata: () => ({ activeKid, kids: [...keys.keys()].sort() }),
  };
}

function parseKeyringJson(raw: string): Record<string, string> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new EncryptionError('DATA_ENCRYPTION_KEYS deve ser um JSON válido por kid.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new EncryptionError('DATA_ENCRYPTION_KEYS deve ser um objeto JSON { "kid": "chave" }.');
  }

  const keys: Record<string, string> = {};

  for (const [kid, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') {
      throw new EncryptionError(`A chave "${kid}" deve ser uma string base64.`);
    }

    keys[kid] = value;
  }

  return keys;
}

function createEncryptorFromEnv(): TextEncryptor {
  if (!env.encryptionKeys.trim()) {
    throw new EncryptionError(
      'DATA_ENCRYPTION_KEYS não configurada. Gere uma chave AES-256 local e preencha o backend/.env.',
    );
  }

  if (!env.encryptionActiveKid.trim()) {
    throw new EncryptionError('DATA_ENCRYPTION_ACTIVE_KID não configurado.');
  }

  return createTextEncryptor({
    activeKid: env.encryptionActiveKid,
    keys: parseKeyringJson(env.encryptionKeys),
  });
}

let defaultEncryptor: TextEncryptor | undefined;

export function getTextEncryptor(): TextEncryptor {
  defaultEncryptor ??= createEncryptorFromEnv();
  return defaultEncryptor;
}

export function validateEncryptionConfig(): EncryptionMetadata {
  return getTextEncryptor().metadata();
}

const VARIAVEL_FALTANDO = /([A-Z][A-Z0-9_]{3,}) n[aã]o configurad/i;

export function statusDoKeyring(): StatusDoKeyring {
  try {
    const metadata = validateEncryptionConfig();

    return { configurada: true, kidAtivo: metadata.activeKid, kids: metadata.kids.length };
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : '';
    const variavel = VARIAVEL_FALTANDO.exec(mensagem)?.[1] ?? 'DATA_ENCRYPTION_KEYS';

    return { configurada: false, variavel };
  }
}

export function encryptText(value: string): string {
  return getTextEncryptor().encrypt(value);
}

export function decryptText(value: string): string {
  return getTextEncryptor().decrypt(value);
}

export function decryptLegacy(value: string): string {
  return getTextEncryptor().decryptLegacy(value);
}
