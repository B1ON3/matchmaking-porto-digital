import assert from 'node:assert/strict';
import { AppointmentStatus } from '@prisma/client';
import { HttpError } from '../utils/http-error';
import {
  intervalosSobrepostos,
  MAX_DURATION_MINUTES,
  montarIntervalo,
  validarInicioFuturo,
  validarTransicaoStatus,
} from './appointment-rules.service';

const base = new Date('2026-11-10T14:00:00.000Z');

assert.equal(intervalosSobrepostos(montarIntervalo(base, 60), montarIntervalo(base, 30)), true);
assert.equal(
  intervalosSobrepostos(montarIntervalo(base, 30), montarIntervalo(new Date(base.getTime() + 30 * 60_000), 60)),
  false,
  'compromissos encostados nao podem ser tratados como conflito',
);
assert.equal(MAX_DURATION_MINUTES, 60);

assert.throws(
  () => validarInicioFuturo(new Date(base.getTime() - 1), base),
  (erro: unknown) => erro instanceof HttpError && erro.statusCode === 400,
  'data no passado deve ser recusada',
);
assert.doesNotThrow(() => validarInicioFuturo(base, base));

assert.doesNotThrow(() => validarTransicaoStatus(AppointmentStatus.AGENDADO, AppointmentStatus.CONCLUIDO));
assert.doesNotThrow(() => validarTransicaoStatus(AppointmentStatus.AGENDADO, AppointmentStatus.CANCELADO));

for (const [atual, novo] of [
  [AppointmentStatus.CANCELADO, AppointmentStatus.CONCLUIDO],
  [AppointmentStatus.CONCLUIDO, AppointmentStatus.CANCELADO],
  [AppointmentStatus.CANCELADO, AppointmentStatus.AGENDADO],
  [AppointmentStatus.CONCLUIDO, AppointmentStatus.CONCLUIDO],
] as const) {
  assert.throws(
    () => validarTransicaoStatus(atual, novo),
    (erro: unknown) => erro instanceof HttpError && erro.statusCode === 400,
    `transicao ${atual} -> ${novo} deve ser recusada`,
  );
}

console.log('appointment-rules.service: todos os testes passaram');
