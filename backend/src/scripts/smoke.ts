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

  const startupToken = startup.body.token;
  const startupId = startup.body.user.startupProfile.id;
  const insights = await api(`/v1/startups/${startupId}/insights`, { token: startupToken });

  assert.equal(insights.status, 200);
  assert.equal(typeof insights.body.metrics.matches, 'number');
  assert.equal(typeof insights.body.marketPotential.score, 'number');
  assert.ok(insights.body.marketPotential.score >= 0 && insights.body.marketPotential.score <= 100);
  assert.ok(Array.isArray(insights.body.marketPotential.factors));

  const investorView = await api(`/v1/startups/${startupId}/insights`, {
    token: investor.body.token,
  });

  assert.equal(investorView.status, 200);
  assert.ok(investorView.body.viewerMatch, 'investidor deve ver o match com a startup');

  const investorInsights = await api(`/v1/investors/${investor.body.user.investorProfile.id}/insights`, {
    token: investor.body.token,
  });

  assert.equal(investorInsights.status, 200);
  assert.equal(typeof investorInsights.body.metrics.matches, 'number');
  assert.equal(typeof investorInsights.body.metrics.appointments, 'number');
  assert.ok(investorInsights.body.profile);

  const admin = await api('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@porto.digital', password: 'senha123' }),
  });
  const overview = await api('/v1/admin/overview', { token: admin.body.token });

  assert.equal(overview.status, 200);
  assert.equal(typeof overview.body.totals.startups, 'number');
  assert.ok(Array.isArray(overview.body.sectors));
  assert.ok(Array.isArray(overview.body.topMatches));

  console.log('smoke: login com perfis passou');
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
