import assert from 'node:assert/strict';
import { ZodError } from 'zod';

import segmentosBrutos from '../content/segmentos-matchmaking.json';
import {
  bonusPorSegmento,
  reordenarMatches,
  segmentoDoInvestidor,
  validarSegmentos,
  type InvestidorParaSegmento,
} from './segmentos-match.service';

const dados = validarSegmentos(segmentosBrutos);

const investidor: InvestidorParaSegmento = {
  sectorInterest: 'Tecnologia, Saúde',
  stageInterest: 'Seed, Série A',
  ticketMin: 50_000,
  ticketMax: 300_000,
  state: 'PE',
};

const outroInvestidor: InvestidorParaSegmento = {
  sectorInterest: 'Economia Criativa',
  stageInterest: 'Pré-seed',
  ticketMin: 20_000,
  ticketMax: 100_000,
  state: 'PB',
};

// (a) bonusPorSegmento usa apenas os setores principais do cluster.
const segmento = segmentoDoInvestidor(investidor);
const setorAlvo = setoresDoSegmento(segmento)[0] ?? '';
assert.ok(setorAlvo, 'o segmento do investidor deve ter setores principais');
assert.equal(bonusPorSegmento(segmento, setorAlvo), 3, 'setor do topo do cluster deve receber bônus');
assert.equal(
  bonusPorSegmento(segmento, 'setor_totalmente_diferente'),
  0,
  'setor fora do cluster não deve receber bônus',
);

// (b) reordenarMatches mantém a ordem por score e só desempata scores iguais.
const outroSegmento = segmentoDoInvestidor(outroInvestidor);
const setorQueDesempata = dados.segmentos
  .flatMap((item) => item.setores)
  .find((setor) => bonusPorSegmento(segmento, setor) === 3 && bonusPorSegmento(outroSegmento, setor) === 0);
assert.ok(setorQueDesempata, 'deve existir um setor que diferencie os dois investidores');

const itens = [
  { id: 'alto', score: 90, investidor: outroInvestidor, setorStartup: setorQueDesempata },
  { id: 'empate-fraco', score: 80, investidor: outroInvestidor, setorStartup: setorQueDesempata },
  { id: 'empate-forte', score: 80, investidor, setorStartup: setorQueDesempata },
];

const ordenados = reordenarMatches(itens, (item) => ({
  investidor: item.investidor,
  setorStartup: item.setorStartup,
}));

assert.deepEqual(
  ordenados.map((item) => item.id),
  ['alto', 'empate-forte', 'empate-fraco'],
  'scores diferentes mandam; o desempate só vale para scores iguais',
);
assert.deepEqual(
  itens.map((item) => item.id),
  ['alto', 'empate-fraco', 'empate-forte'],
  'a função não pode mutar o array de entrada',
);

// startups com múltiplos setores também devem receber o bônus (paridade com matching.rules).
assert.equal(
  bonusPorSegmento(segmento, `setor_fora, ${setorAlvo}`),
  3,
  'lista de setores da startup deve ser dividida antes da comparação',
);

// valores ausentes precisam ter a mesma normalização do Python (cluster 0).
assert.equal(
  segmentoDoInvestidor({
    sectorInterest: 'n/d',
    stageInterest: 'n/d',
    ticketMin: 0,
    ticketMax: 0,
    state: '',
  }),
  0,
  "'n/d' deve virar valor ausente, como no features.py",
);

// desempate determinístico quando score e bônus são iguais
const comChave = [
  { id: 'b', score: 70, chave: 'IV002' },
  { id: 'a', score: 70, chave: 'IV001' },
];
assert.deepEqual(
  reordenarMatches(comChave, () => ({
    investidor: investidor,
    setorStartup: setorAlvo,
    chaveDesempate: undefined,
  })).map((item) => item.id),
  ['b', 'a'],
  'sem chave, a ordem original deve ser preservada',
);
assert.deepEqual(
  reordenarMatches(comChave, (item) => ({
    investidor,
    setorStartup: setorAlvo,
    chaveDesempate: item.chave,
  })).map((item) => item.id),
  ['a', 'b'],
  'com chave, a ordem deve ser determinística',
);

// visão do investidor: o mesmo perfil, startups concorrentes em score igual
const startups = [
  { id: 'startup-fora', score: 70, setorStartup: 'setor_totalmente_diferente' },
  { id: 'startup-dentro', score: 70, setorStartup: setorAlvo },
];
const ordenadas = reordenarMatches(startups, (item) => ({
  investidor,
  setorStartup: item.setorStartup,
  chaveDesempate: item.id,
}));
assert.deepEqual(
  ordenadas.map((item) => item.id),
  ['startup-dentro', 'startup-fora'],
  'o desempate também ordena startups para um investidor',
);

// (c) JSON inválido é rejeitado pelo Zod antes de qualquer uso em produção.
assert.throws(() => validarSegmentos({ versao: 'av2-invalido' }), ZodError);
assert.throws(
  () =>
    validarSegmentos({
      ...dados,
      arvore: {
        feature: 'feature_inesperada',
        limite: 0,
        esquerda: { classe: 0 },
        direita: { classe: 1 },
      },
    }),
  ZodError,
  'a árvore só pode usar as features declaradas no JSON',
);
assert.throws(
  () => validarSegmentos({ ...dados, arvore: { classe: 99 } }),
  ZodError,
  'a árvore não pode apontar para um segmento inexistente',
);
assert.throws(
  () => validarSegmentos({ ...dados, k: dados.k + 1 }),
  ZodError,
  'k deve bater com a quantidade de segmentos',
);

console.log('segmentos-match.service: ok');

function setoresDoSegmento(id: number): string[] {
  return dados.segmentos.find((item) => item.id === id)?.setores ?? [];
}
