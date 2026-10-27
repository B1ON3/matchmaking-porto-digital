import assert from 'node:assert/strict';
import type { MatchDetails } from './matching.rules';
import { montarMatrizCompatibilidade, podeVerCompatibilidade } from './compatibility.service';

const startup = {
  id: 'startup-1',
  userId: 'user-startup',
  companyName: 'Maré Tech',
  sector: 'Tecnologia',
  stage: 'Seed',
  city: 'Recife',
  state: 'PE',
  description: 'Software para gestão portuária.',
  logoUrl: null,
  user: { name: 'Ana Lima', verifiedAt: new Date('2026-01-01T00:00:00Z') },
};

const investidor = {
  id: 'investor-1',
  userId: 'user-investor',
  companyName: 'Porto Capital',
  sectorInterest: 'Tecnologia, Design',
  stageInterest: 'Seed, Pre-seed',
  ticketMin: 50000,
  ticketMax: 300000,
  city: 'Recife',
  state: 'PE',
  bio: 'Investe em tecnologia no Nordeste.',
  user: { name: 'Bruno Costa', verifiedAt: null },
};

const detalhes = (valor: MatchDetails) => valor;

const perfeito = montarMatrizCompatibilidade({
  matchId: 'match-1',
  score: 100,
  reason: 'Conexão forte: setor, estágio e ticket alinhados.',
  details: detalhes({ setor: 35, estagio: 25, ticket: 25, regiao: 15, verificacao: 10 }),
  startup,
  investor: investidor,
});

assert.equal(perfeito.score, 100);
assert.equal(perfeito.dimensions.length, 5);
assert.ok(perfeito.dimensions.every((dimensao) => dimensao.status === 'ATENDE'));
assert.equal(
  perfeito.dimensions.reduce((soma, dimensao) => soma + dimensao.points, 0),
  110,
  'as dimensoes devem somar todos os pesos, inclusive o bonus de verificacao',
);
assert.ok(perfeito.summary.strengths.length === 5);
assert.equal(perfeito.summary.attention.length, 0);
assert.equal(perfeito.startup.name, 'Maré Tech');
assert.equal(perfeito.investor.name, 'Porto Capital');

const intermediario = montarMatrizCompatibilidade({
  matchId: 'match-2',
  score: 67,
  reason: 'Boa afinidade: a maior parte dos critérios bate.',
  details: detalhes({ setor: 35, estagio: 15, ticket: 9, regiao: 8, verificacao: 0 }),
  startup,
  investor: {
    ...investidor,
    sectorInterest: 'Tecnologia',
    stageInterest: 'Pre-seed',
    ticketMin: 300000,
    ticketMax: 500000,
    city: 'Salvador',
    state: 'BA',
  },
});

assert.equal(intermediario.dimensions[0].status, 'ATENDE');
assert.equal(intermediario.dimensions[1].status, 'PARCIAL');
assert.equal(intermediario.dimensions[1].points, 15);
assert.equal(intermediario.dimensions[2].status, 'PARCIAL');
assert.equal(intermediario.dimensions[3].status, 'PARCIAL');
assert.ok(intermediario.summary.attention.length === 4);
assert.match(intermediario.dimensions[2].evidence, /proximidade parcial/);
assert.match(intermediario.dimensions[3].evidence, /Nordeste/);

const semAfinidade = montarMatrizCompatibilidade({
  matchId: 'match-3',
  score: 0,
  reason: 'Sem critérios de afinidade suficientes.',
  details: detalhes({ setor: 0, estagio: 0, ticket: 0, regiao: 0, verificacao: 0 }),
  startup: { ...startup, sector: 'Educação', stage: 'Ideação' },
  investor: {
    ...investidor,
    sectorInterest: 'Saúde',
    stageInterest: 'Série B',
    ticketMin: 0,
    ticketMax: 0,
    state: 'SP',
  },
});

assert.ok(semAfinidade.dimensions.every((dimensao) => dimensao.status === 'NAO_ATENDE'));
assert.equal(semAfinidade.dimensions[2].points, 0);
assert.match(semAfinidade.dimensions[2].evidence, /não informou faixa/);
assert.equal(semAfinidade.summary.strengths.length, 0);
assert.equal(semAfinidade.summary.attention.length, 5);

assert.equal(podeVerCompatibilidade({ id: 'user-startup', role: 'STARTUP' }, 'user-startup', 'user-investor'), true);
assert.equal(podeVerCompatibilidade({ id: 'user-investor', role: 'INVESTOR' }, 'user-startup', 'user-investor'), true);
assert.equal(podeVerCompatibilidade({ id: 'admin-1', role: 'ADMIN' }, 'user-startup', 'user-investor'), true);
assert.equal(podeVerCompatibilidade({ id: 'mentor-1', role: 'MENTOR' }, 'user-startup', 'user-investor'), false);

console.log('compatibility.service: todos os testes passaram');
