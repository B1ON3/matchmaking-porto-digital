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

async function apiText(path: string, token: string) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const body = new TextDecoder('utf-8').decode(bytes);

  return {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    disposicao: response.headers.get('content-disposition') ?? '',
    bom: bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf,
    body,
  };
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

  const pessoas = await api('/v1/admin/users?busca=mentor&porPagina=10', {
    token: admin.body.token,
  });

  assert.equal(pessoas.status, 200);
  assert.ok(
    pessoas.body.users.some((usuario: { id: string }) => usuario.id === mentor.body.user.id),
    'busca de pessoas deve encontrar o mentor',
  );

  const semMotivo = await api(`/v1/admin/users/${mentor.body.user.id}/status`, {
    method: 'PATCH',
    token: admin.body.token,
    body: JSON.stringify({ status: 'SUSPENSO' }),
  });

  assert.equal(semMotivo.status, 400, 'suspensao sem motivo deve ser recusada');

  const autoSuspensao = await api(`/v1/admin/users/${admin.body.user.id}/status`, {
    method: 'PATCH',
    token: admin.body.token,
    body: JSON.stringify({ status: 'SUSPENSO', motivo: '[Smoke] tentativa invalida' }),
  });

  assert.equal(autoSuspensao.status, 400, 'admin nao pode suspender a si mesmo');

  let mentorSuspenso = false;

  try {
    const suspensao = await api(`/v1/admin/users/${mentor.body.user.id}/status`, {
      method: 'PATCH',
      token: admin.body.token,
      body: JSON.stringify({ status: 'SUSPENSO', motivo: '[Smoke] validar bloqueio de acesso' }),
    });

    assert.equal(suspensao.status, 200);
    assert.equal(suspensao.body.status, 'SUSPENSO');
    assert.equal(suspensao.body.moderationReason, '[Smoke] validar bloqueio de acesso');
    mentorSuspenso = true;

    const loginSuspenso = await api('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'mentor@porto.digital', password: 'senha123' }),
    });

    assert.equal(loginSuspenso.status, 403, 'conta suspensa nao pode autenticar');

    const rotaSuspensa = await api('/v1/auth/me', { token: mentor.body.token });
    assert.equal(rotaSuspensa.status, 403, 'token antigo de conta suspensa deve ser bloqueado');
  } finally {
    if (mentorSuspenso) {
      const reativacao = await api(`/v1/admin/users/${mentor.body.user.id}/status`, {
        method: 'PATCH',
        token: admin.body.token,
        body: JSON.stringify({ status: 'ATIVO', motivo: '[Smoke] reativar apos teste' }),
      });

      assert.equal(reativacao.status, 200);
      assert.equal(reativacao.body.status, 'ATIVO');
    }
  }

  const loginReativado = await api('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'mentor@porto.digital', password: 'senha123' }),
  });

  assert.equal(loginReativado.status, 200, 'reativacao deve devolver o acesso');

  let perfilOculto = false;

  try {
    const ocultacao = await api(`/v1/admin/profiles/${startupId}/hide`, {
      method: 'POST',
      token: admin.body.token,
      body: JSON.stringify({ motivo: '[Smoke] validar ocultacao' }),
    });

    assert.equal(ocultacao.status, 200);
    assert.equal(ocultacao.body.tipo, 'STARTUP');
    perfilOculto = true;

    const listagemOculta = await api('/v1/startups?porPagina=50');
    assert.equal(listagemOculta.status, 200);
    assert.ok(
      !listagemOculta.body.startups.some((startup: { id: string }) => startup.id === startupId),
      'perfil oculto nao deve aparecer na listagem publica',
    );
  } finally {
    if (perfilOculto) {
      const restauracao = await api(`/v1/admin/profiles/${startupId}/restore`, {
        method: 'POST',
        token: admin.body.token,
        body: JSON.stringify({ motivo: '[Smoke] restaurar apos teste' }),
      });

      assert.equal(restauracao.status, 200);
    }
  }

  const listagemRestaurada = await api('/v1/startups?porPagina=50');
  assert.ok(
    listagemRestaurada.body.startups.some((startup: { id: string }) => startup.id === startupId),
    'perfil restaurado deve voltar para a listagem publica',
  );

  const hoje = new Date();
  const seteDiasAtras = new Date(hoje.getTime() - 6 * 86400000);
  const from = seteDiasAtras.toISOString().slice(0, 10);
  const to = hoje.toISOString().slice(0, 10);
  const metricas = await api(`/v1/admin/metrics?from=${from}&to=${to}&granularity=day`, {
    token: admin.body.token,
  });

  assert.equal(metricas.status, 200);
  assert.equal(typeof metricas.body.users.newTotal, 'number');
  assert.equal(typeof metricas.body.matches.created, 'number');
  assert.equal(typeof metricas.body.messages.sent, 'number');
  assert.equal(metricas.body.funnel.length, 4);
  assert.ok(Array.isArray(metricas.body.series));
  assert.ok(metricas.body.series.every((ponto: { bucket: string }) => /^\d{4}-\d{2}-\d{2}$/.test(ponto.bucket)));

  const csv = await apiText(`/v1/admin/metrics/export.csv?from=${from}&to=${to}&granularity=day`, admin.body.token);

  assert.equal(csv.status, 200);
  assert.ok(csv.contentType.startsWith('text/csv'));
  assert.ok(csv.disposicao.includes('attachment'));
  assert.ok(csv.bom, 'CSV deve comecar com BOM UTF-8');
  assert.ok(csv.body.startsWith('Secao;Indicador;Valor'), 'CSV deve ter cabecalho');
  assert.ok(csv.body.includes('Resumo;Usuarios ativos;'));

  await new Promise((resolve) => setTimeout(resolve, 200));

  const trilha = await api('/v1/audit?acao=STATUS_USUARIO_ALTERADO&porPagina=20', {
    token: admin.body.token,
  });

  assert.equal(trilha.status, 200);
  assert.ok(trilha.body.logs.length >= 1, 'suspensao e reativacao devem gerar auditoria');
  assert.ok(
    trilha.body.logs.some((log: { details: string | null }) =>
      (log.details ?? '').includes('validar bloqueio de acesso'),
    ),
    'auditoria deve guardar o motivo informado',
  );

  console.log('smoke: login com perfis passou');
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
