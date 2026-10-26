import { AppointmentStatus } from '@prisma/client';
import { HttpError } from '../utils/http-error';

export const DURACOES_PERMITIDAS = [30, 60] as const;

export type DuracaoPermitida = (typeof DURACOES_PERMITIDAS)[number];

export const MAX_DURATION_MINUTES = Math.max(...DURACOES_PERMITIDAS);

const TRANSICOES: Record<AppointmentStatus, AppointmentStatus[]> = {
  AGENDADO: [AppointmentStatus.CONCLUIDO, AppointmentStatus.CANCELADO],
  CONCLUIDO: [],
  CANCELADO: [],
};

export interface Intervalo {
  inicio: Date;
  fim: Date;
  durationMinutes: number;
}

export function montarIntervalo(scheduledAt: Date, durationMinutes: number): Intervalo {
  return {
    inicio: scheduledAt,
    fim: new Date(scheduledAt.getTime() + durationMinutes * 60_000),
    durationMinutes,
  };
}

export function intervalosSobrepostos(a: Intervalo, b: Intervalo): boolean {
  return a.inicio.getTime() < b.fim.getTime() && b.inicio.getTime() < a.fim.getTime();
}

export function validarInicioFuturo(scheduledAt: Date, agora = new Date()): void {
  if (scheduledAt.getTime() < agora.getTime()) {
    throw HttpError.badRequest('nao da pra agendar uma reuniao no passado');
  }
}

export function validarTransicaoStatus(atual: AppointmentStatus, novo: AppointmentStatus): void {
  if (!TRANSICOES[atual].includes(novo)) {
    throw HttpError.badRequest(`nao da pra mudar um compromisso de ${atual} para ${novo}`);
  }
}
