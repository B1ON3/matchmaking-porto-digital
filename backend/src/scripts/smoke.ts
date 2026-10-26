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

  const criado = await api(`/v1/startups/${startupId}/projects`, {
    method: 'POST',
    token: startupToken,
    body: JSON.stringify({
      title: 'Piloto de teste',
      summary: 'Criado pelo smoke',
      status: 'PLANEJADO',
    }),
  });

  assert.equal(criado.status, 201);
  assert.equal(criado.body.title, 'Piloto de teste');

  const lista = await api(`/v1/startups/${startupId}/projects`, { token: startupToken });
  assert.ok(lista.body.some((projeto: { id: string }) => projeto.id === criado.body.id));

  const alterado = await api(`/v1/startups/${startupId}/projects/${criado.body.id}`, {
    method: 'PUT',
    token: startupToken,
    body: JSON.stringify({ status: 'CONCLUIDO' }),
  });

  assert.equal(alterado.status, 200);
  assert.equal(alterado.body.status, 'CONCLUIDO');

  const invasor = await api(`/v1/startups/${startupId}/projects/${criado.body.id}`, {
    method: 'PUT',
    token: investor.body.token,
    body: JSON.stringify({ title: 'Invadido' }),
  });

  assert.equal(invasor.status, 403);

  const removido = await api(`/v1/startups/${startupId}/projects/${criado.body.id}`, {
    method: 'DELETE',
    token: startupToken,
  });

  assert.equal(removido.status, 204);

  const matchesDaStartup = await api('/v1/matches?minimo=0&porPagina=50', { token: startupToken });
  const matchDaStartupComInvestidor = matchesDaStartup.body.matches.find(
    (match: { investor: { user: { id: string } } }) => match.investor.user.id === investor.body.user.id,
  );

  assert.ok(matchDaStartupComInvestidor, 'startup deve ter um match com o investidor do smoke');
  const matchId = matchDaStartupComInvestidor.id;

  const compatibilidade = await api(`/v1/matches/${matchId}/compatibility`, { token: startupToken });

  assert.equal(compatibilidade.status, 200);
  assert.equal(compatibilidade.body.matchId, matchId);
  assert.equal(compatibilidade.body.dimensions.length, 4);
  assert.equal(
    compatibilidade.body.dimensions.reduce((soma: number, dimensao: { points: number }) => soma + dimensao.points, 0),
    compatibilidade.body.score,
    'a soma da matriz deve bater com o score do match',
  );
  assert.ok(compatibilidade.body.startup.name);
  assert.ok(compatibilidade.body.investor.name);

  const compatibilidadeInvestidor = await api(`/v1/matches/${matchId}/compatibility`, {
    token: investor.body.token,
  });

  assert.equal(compatibilidadeInvestidor.status, 200);

  const mensagem = await api('/v1/messages', {
    method: 'POST',
    token: startupToken,
    body: JSON.stringify({ recipientId: investor.body.user.id, content: '[Smoke] contexto do match' }),
  });

  assert.equal(mensagem.status, 201);
  assert.equal(mensagem.body.recipientId, investor.body.user.id);

  const paginaMensagens = await api(`/v1/messages?conversaCom=${investor.body.user.id}&limit=10`, {
    token: startupToken,
  });

  assert.equal(paginaMensagens.status, 200);
  assert.ok(Array.isArray(paginaMensagens.body.messages));
  assert.equal(typeof paginaMensagens.body.hasMore, 'boolean');

  const naoLidas = await api('/v1/messages/nao-lidas', { token: investor.body.token });
  assert.equal(naoLidas.status, 200);
  assert.ok(naoLidas.body.total >= 1, 'mensagem nova deve contar como nao lida');

  const leitura = await api(`/v1/messages/conversas/${startup.body.user.id}/read`, {
    method: 'POST',
    token: investor.body.token,
  });

  assert.equal(leitura.status, 200);
  assert.ok(leitura.body.updated >= 1);

  const conversas = await api('/v1/messages/conversas', { token: investor.body.token });
  assert.equal(conversas.status, 200);
  assert.ok(
    conversas.body.some((conversa: { usuario: { id: string } }) => conversa.usuario.id === startup.body.user.id),
  );

  const mensagemRemovida = await api(`/v1/messages/${mensagem.body.id}`, {
    method: 'DELETE',
    token: startupToken,
  });

  assert.equal(mensagemRemovida.status, 204);

  const mentor = await api('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'mentor@porto.digital', password: 'senha123' }),
  });
  const compatibilidadeNegada = await api(`/v1/matches/${matchId}/compatibility`, {
    token: mentor.body.token,
  });

  assert.equal(compatibilidadeNegada.status, 403);

  const mensagemSemMatch = await api('/v1/messages', {
    method: 'POST',
    token: startupToken,
    body: JSON.stringify({ recipientId: mentor.body.user.id, content: '[Smoke] sem match' }),
  });

  assert.equal(mensagemSemMatch.status, 403);

  const inicioVinculada = new Date(Date.now() + 30 * 86400000);

  const comMatch = await api('/v1/appointments', {
    method: 'POST',
    token: startupToken,
    body: JSON.stringify({
      title: '[Smoke] Reunião vinculada',
      description: 'Teste de vínculo',
      scheduledAt: inicioVinculada.toISOString(),
      durationMinutes: 30,
      matchId,
    }),
  });

  assert.equal(comMatch.status, 201);
  assert.equal(comMatch.body.matchId, matchId);
  assert.equal(comMatch.body.durationMinutes, 30);

  const conflitoPreview = await api(
    `/v1/appointments/conflicts?scheduledAt=${encodeURIComponent(inicioVinculada.toISOString())}` +
      `&durationMinutes=30&matchId=${matchId}`,
    { token: investor.body.token },
  );

  assert.equal(conflitoPreview.status, 200);
  assert.equal(conflitoPreview.body.conflict, true);

  const conflito = await api('/v1/appointments', {
    method: 'POST',
    token: investor.body.token,
    body: JSON.stringify({
      title: '[Smoke] Reunião sobreposta',
      scheduledAt: new Date(inicioVinculada.getTime() + 15 * 60000).toISOString(),
      durationMinutes: 30,
      matchId,
    }),
  });

  assert.equal(conflito.status, 409);

  const semMatch = await api('/v1/appointments', {
    method: 'POST',
    token: startupToken,
    body: JSON.stringify({
      title: '[Smoke] Reunião privada',
      scheduledAt: new Date(Date.now() + 172800000).toISOString(),
    }),
  });

  assert.equal(semMatch.status, 201);

  const agendaInvestidor = await api('/v1/appointments?futuros=false', {
    token: investor.body.token,
  });
  const titulos = agendaInvestidor.body.map((item: { title: string }) => item.title);

  assert.ok(titulos.includes('[Smoke] Reunião vinculada'));
  assert.ok(!titulos.includes('[Smoke] Reunião privada'));

  const privadaDoInvestidor = await api(`/v1/appointments/${semMatch.body.id}`, {
    token: investor.body.token,
  });

  assert.equal(privadaDoInvestidor.status, 404);

  const cancelado = await api(`/v1/appointments/${comMatch.body.id}/status`, {
    method: 'PUT',
    token: startupToken,
    body: JSON.stringify({ status: 'CANCELADO' }),
  });

  assert.equal(cancelado.status, 200);

  const transicaoInvalida = await api(`/v1/appointments/${comMatch.body.id}/status`, {
    method: 'PUT',
    token: startupToken,
    body: JSON.stringify({ status: 'CONCLUIDO' }),
  });

  assert.equal(transicaoInvalida.status, 400);

  const limparVinculada = await api(`/v1/appointments/${comMatch.body.id}`, {
    method: 'DELETE',
    token: startupToken,
  });
  const limparPrivada = await api(`/v1/appointments/${semMatch.body.id}`, {
    method: 'DELETE',
    token: startupToken,
  });

  assert.equal(limparVinculada.status, 204);
  assert.equal(limparPrivada.status, 204);

  const admin = await api('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@porto.digital', password: 'senha123' }),
  });
  const compatibilidadeAdmin = await api(`/v1/matches/${matchId}/compatibility`, {
    token: admin.body.token,
  });

  assert.equal(compatibilidadeAdmin.status, 200);

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
