import assert from 'node:assert/strict';
import {
  calculaScore,
  calculaEstagio,
  calculaRegiao,
  calculaSetor,
  calculaTicket,
  montaReason,
} from './matching.rules';

const startup = { sector: 'Tecnologia', stage: 'Seed', state: 'PE' };

assert.equal(
  calculaScore(startup, {
    sectorInterest: 'Tecnologia, Design',
    stageInterest: 'Seed, Pre-seed',
    ticketMin: 50000,
    ticketMax: 300000,
    state: 'PE',
  }).score,
  100,
  'cenário perfeito deve somar 100',
);

assert.equal(
  calculaScore(startup, {
    sectorInterest: 'Tecnologia',
    stageInterest: 'Pre-seed',
    ticketMin: 50000,
    ticketMax: 300000,
    state: 'PE',
  }).score,
  90,
  'estágio adjacente deve valer 15',
);

assert.equal(
  calculaEstagio(
    { sector: 'Tecnologia', stage: 'Pré-seed', state: 'PE' },
    { sectorInterest: 'Tecnologia', stageInterest: 'Pre-seed', ticketMin: 0, ticketMax: 0, state: 'PE' },
  ),
  25,
  'acento e caixa não podem impedir o match exato',
);

assert.equal(
  calculaSetor(
    { sector: 'Tech', stage: 'Seed', state: 'PE' },
    { sectorInterest: 'Tecnologia', stageInterest: 'Seed', ticketMin: 0, ticketMax: 0, state: 'PE' },
  ),
  35,
  'alias tech deve casar com tecnologia',
);

assert.equal(
  calculaTicket(startup, {
    sectorInterest: 'Tecnologia',
    stageInterest: 'Seed',
    ticketMin: 300000,
    ticketMax: 500000,
    state: 'PE',
  }),
  9,
  'ticket fora da faixa deve valer crédito parcial arredondado',
);

assert.equal(
  calculaRegiao(startup, {
    sectorInterest: 'Tecnologia',
    stageInterest: 'Seed',
    ticketMin: 0,
    ticketMax: 0,
    state: 'BA',
  }),
  8,
  'outra UF do Nordeste deve valer 8',
);

assert.equal(montaReason(80), 'Conexão forte: setor, estágio e ticket alinhados.');
assert.equal(montaReason(60), 'Boa afinidade: a maior parte dos critérios bate.');
assert.equal(montaReason(40), 'Afinidade moderada: vale uma conversa para explorar.');
assert.equal(montaReason(1), 'Afinidade baixa: poucos pontos em comum, mas a conversa continua aberta.');
assert.equal(montaReason(0), 'Sem critérios de afinidade suficientes.');

assert.equal(
  calculaScore(
    { sector: 'Educação', stage: 'Ideação', state: 'PE' },
    { sectorInterest: 'Saúde', stageInterest: 'Série B', ticketMin: 0, ticketMax: 0, state: 'SP' },
  ).score,
  0,
  'sem setor, estágio, ticket ou região não há score',
);

console.log('matching.rules: todos os testes passaram');
