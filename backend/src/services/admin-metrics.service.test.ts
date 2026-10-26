import assert from 'node:assert/strict';
import { MatchStatus, UserRole } from '@prisma/client';
import { HttpError } from '../utils/http-error';
import {
  bucketKey,
  buildCsv,
  buildMetricsCsv,
  contarConversasDeMatchesAceitos,
  escapeCsvField,
  listBucketKeys,
  montarFunil,
  resolveMetricsRange,
  type AdminMetrics,
} from './admin-metrics.service';

const agora = new Date('2026-10-26T12:00:00.000Z');

const periodo = resolveMetricsRange({ from: '2026-10-20', to: '2026-10-26' }, agora);
assert.equal(periodo.days, 7);
assert.equal(periodo.from.toISOString(), '2026-10-20T00:00:00.000Z');
assert.equal(periodo.to.toISOString(), '2026-10-26T23:59:59.999Z');
assert.equal(periodo.granularity, 'day');

const padrao = resolveMetricsRange({}, agora);
assert.equal(padrao.days, 30);
assert.equal(padrao.to.toISOString(), agora.toISOString());

assert.equal(resolveMetricsRange({ granularity: 'semana' }).granularity, 'week');

assert.throws(
  () => resolveMetricsRange({ from: '2026-10-27', to: '2026-10-26' }),
  (erro: unknown) => erro instanceof HttpError && erro.statusCode === 400,
  'periodo invertido deve ser recusado',
);
assert.throws(
  () => resolveMetricsRange({ from: '2024-01-01', to: '2026-10-26' }),
  (erro: unknown) => erro instanceof HttpError && erro.statusCode === 400,
  'periodo acima de 366 dias deve ser recusado',
);
assert.throws(
  () => resolveMetricsRange({ from: 'ontem' }),
  (erro: unknown) => erro instanceof HttpError && erro.statusCode === 400,
  'data invalida deve ser recusada',
);
assert.throws(
  () => resolveMetricsRange({ granularity: 'mes' }),
  (erro: unknown) => erro instanceof HttpError && erro.statusCode === 400,
  'granularidade invalida deve ser recusada',
);

assert.equal(bucketKey(new Date('2026-10-26T23:10:00.000Z'), 'day'), '2026-10-26');
assert.equal(bucketKey(new Date('2026-10-26T23:10:00.000Z'), 'week'), '2026-10-26');
assert.equal(bucketKey(new Date('2026-04-05T10:00:00.000Z'), 'week'), '2026-03-30');
assert.deepEqual(listBucketKeys(new Date('2026-10-20T00:00:00Z'), new Date('2026-10-26T23:59:59Z'), 'day'), [
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
  '2026-10-26',
]);
assert.deepEqual(listBucketKeys(new Date('2026-10-20T00:00:00Z'), new Date('2026-10-26T23:59:59Z'), 'week'), [
  '2026-10-19',
  '2026-10-26',
]);

const funil = montarFunil(10, 4, 2, 1);
assert.equal(funil.length, 4);
assert.deepEqual(
  funil.map((etapa) => etapa.conversionFromPrevious),
  [100, 40, 50, 50],
);

const conversas = contarConversasDeMatchesAceitos(
  [
    { status: MatchStatus.ACEITO, startup: { userId: 'startup-1' }, investor: { userId: 'investidor-1' } },
    { status: MatchStatus.ACEITO, startup: { userId: 'startup-2' }, investor: { userId: 'investidor-2' } },
    { status: MatchStatus.PENDENTE, startup: { userId: 'startup-3' }, investor: { userId: 'investidor-3' } },
  ],
  [
    { senderId: 'investidor-1', recipientId: 'startup-1' },
    { senderId: 'startup-2', recipientId: 'investidor-2' },
    { senderId: 'startup-2', recipientId: 'investidor-2' },
    { senderId: 'startup-3', recipientId: 'investidor-3' },
    { senderId: 'startup-1', recipientId: 'investidor-9' },
  ],
);
assert.equal(conversas, 2, 'so deve contar pares com match aceito, sem duplicar mensagens');
assert.ok(
  montarFunil(10, 4, conversas, 1).every((etapa) => etapa.conversionFromPrevious <= 100),
  'funil nao deve passar de 100% quando as conversas derivam dos matches aceitos',
);

assert.equal(escapeCsvField('texto simples'), 'texto simples');
assert.equal(escapeCsvField('a;b'), '"a;b"');
assert.equal(escapeCsvField('diz "oi"'), '"diz ""oi"""');
assert.equal(escapeCsvField(' linha '), '" linha "');
assert.equal(escapeCsvField('duas\nlinhas'), '"duas\nlinhas"');
assert.equal(escapeCsvField(null), '');
assert.equal(escapeCsvField(12), '12');

const csv = buildCsv([
  ['Nome', 'Observacao'],
  ['Ana', 'teste;com ponto e virgula'],
]);
assert.ok(csv.startsWith('\uFEFFNome;Observacao\r\n'));
assert.ok(csv.includes('Ana;"teste;com ponto e virgula"'));
assert.ok(csv.endsWith('\r\n'));

const metricas: AdminMetrics = {
  range: { from: '2026-10-20T00:00:00.000Z', to: '2026-10-26T23:59:59.999Z', days: 7, granularity: 'day' },
  users: {
    newTotal: 3,
    activeTotal: 2,
    newByRole: [
      { role: UserRole.STARTUP, count: 2 },
      { role: UserRole.INVESTOR, count: 1 },
      { role: UserRole.MENTOR, count: 0 },
      { role: UserRole.ADMIN, count: 0 },
    ],
    activeByRole: [
      { role: UserRole.STARTUP, count: 1 },
      { role: UserRole.INVESTOR, count: 1 },
      { role: UserRole.MENTOR, count: 0 },
      { role: UserRole.ADMIN, count: 0 },
    ],
  },
  matches: { created: 5, accepted: 2, declined: 1, pending: 2 },
  messages: { sent: 9 },
  appointments: { created: 3, scheduled: 2, completed: 1, cancelled: 0 },
  funnel: montarFunil(5, 2, 1, 3),
  topSectors: [{ label: 'Tecnologia; SaaS', count: 2, share: 50 }],
  topCities: [{ label: 'Recife', count: 3, share: 75 }],
  topStages: [{ label: 'Seed', count: 3, share: 75 }],
  series: [
    { bucket: '2026-10-20', users: 1, matches: 2, messages: 4, appointments: 1 },
    { bucket: '2026-10-21', users: 2, matches: 3, messages: 5, appointments: 2 },
  ],
};

const csvMetricas = buildMetricsCsv(metricas);
assert.ok(csvMetricas.startsWith('\uFEFFSecao;Indicador;Valor\r\n'));
assert.ok(csvMetricas.includes('Resumo;Usuarios ativos;2'));
assert.ok(csvMetricas.includes('Funil;Matches aceitos - conversao;40%'));
assert.ok(csvMetricas.includes('Top setores;"Tecnologia; SaaS";2'));
assert.ok(csvMetricas.includes('Serie;Periodo;Novos usuarios;Matches;Mensagens;Reunioes'));
assert.ok(csvMetricas.includes('Serie;2026-10-21;2;3;5;2'));

console.log('admin-metrics.service: todos os testes passaram');
