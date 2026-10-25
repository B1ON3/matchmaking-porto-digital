import assert from 'node:assert/strict';

const BASE = process.env.API_URL ?? 'http://localhost:5000/api';

async function api<T = any>(path: string, options: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = options;
  const response = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(rest.headers ?? {}),
    },
  });
  const body = response.status === 204 ? null : ((await response.json()) as T);
  return { status: response.status, body };
}

async function main() {
  const startup = await api('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'startup@porto.digital', password: 'senha123' }),
  });

  assert.equal(startup.status, 200);
  assert.ok(startup.body.user.startupProfile, 'login da startup deve trazer startupProfile');

  const investor = await api('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'investidor@porto.digital', password: 'senha123' }),
  });

  assert.equal(investor.status, 200);
  assert.ok(investor.body.user.investorProfile, 'login do investidor deve trazer investorProfile');

  console.log('smoke: login com perfis passou');
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
