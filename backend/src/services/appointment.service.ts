import { UserRole } from '@prisma/client';
import type { AppointmentStatus } from '@prisma/client';
import type { AppointmentRecord } from '../repositories/appointment.repository';
import {
  create,
  findAccess,
  findConflictCandidates,
  findMatchForAppointment,
  findVisible,
  list,
  remove,
  updateStatus,
} from '../repositories/appointment.repository';
import { decryptText, encryptText } from './encryption.service';
import {
  intervalosSobrepostos,
  MAX_DURATION_MINUTES,
  montarIntervalo,
  validarInicioFuturo,
  validarTransicaoStatus,
} from './appointment-rules.service';
import { HttpError } from '../utils/http-error';

export interface AppointmentViewer {
  id: string;
  role: UserRole;
}

export interface AppointmentInput {
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes: 30 | 60;
  matchId?: string;
}

export interface ConflictPreview {
  conflict: boolean;
  conflitos: {
    id: string;
    title: string;
    scheduledAt: Date;
    durationMinutes: number;
  }[];
}

function decifrarDescricao(agendamento: AppointmentRecord): AppointmentRecord {
  return {
    ...agendamento,
    description: agendamento.description ? decryptText(agendamento.description) : null,
  };
}

function podeGerenciar(
  agendamento: {
    createdById: string;
    match: { startup: { userId: string }; investor: { userId: string } } | null;
  },
  usuario: AppointmentViewer,
): boolean {
  if (usuario.role === UserRole.ADMIN || agendamento.createdById === usuario.id) {
    return true;
  }

  if (!agendamento.match) {
    return false;
  }

  return agendamento.match.startup.userId === usuario.id || agendamento.match.investor.userId === usuario.id;
}

async function participantesDoAgendamento(usuario: AppointmentViewer, matchId?: string): Promise<string[]> {
  if (!matchId) {
    return [usuario.id];
  }

  const match = await findMatchForAppointment(matchId);

  if (!match) {
    throw HttpError.notFound('match nao encontrado');
  }

  const participa = match.startup.userId === usuario.id || match.investor.userId === usuario.id;

  if (!participa && usuario.role !== UserRole.ADMIN) {
    throw HttpError.forbidden('voce nao faz parte desse match');
  }

  if (match.status === 'RECUSADO' && usuario.role !== UserRole.ADMIN) {
    throw HttpError.badRequest('essa conexao foi recusada e nao pode receber agendamentos');
  }

  return [...new Set([usuario.id, match.startup.userId, match.investor.userId])];
}

async function encontrarConflitos(
  participantes: string[],
  scheduledAt: Date,
  durationMinutes: number,
): Promise<ConflictPreview['conflitos']> {
  const intervaloNovo = montarIntervalo(scheduledAt, durationMinutes);
  const inicioDaBusca = new Date(scheduledAt.getTime() - MAX_DURATION_MINUTES * 60_000);

  const candidatos = await findConflictCandidates(participantes, inicioDaBusca, intervaloNovo.fim);

  return candidatos.filter((candidato) =>
    intervalosSobrepostos(intervaloNovo, montarIntervalo(candidato.scheduledAt, candidato.durationMinutes)),
  );
}

export async function listarAgendamentos(
  usuario: AppointmentViewer,
  status?: AppointmentStatus,
  futuros = true,
): Promise<AppointmentRecord[]> {
  const agendamentos = await list(usuario, status, futuros);
  return agendamentos.map(decifrarDescricao);
}

export async function obterAgendamento(id: string, usuario: AppointmentViewer): Promise<AppointmentRecord> {
  const agendamento = await findVisible(id, usuario);

  if (!agendamento) {
    throw HttpError.notFound('agendamento nao encontrado');
  }

  return decifrarDescricao(agendamento);
}

export async function verificarConflito(
  usuario: AppointmentViewer,
  scheduledAt: Date,
  durationMinutes: number,
  matchId?: string,
): Promise<ConflictPreview> {
  validarInicioFuturo(scheduledAt);

  const participantes = await participantesDoAgendamento(usuario, matchId);
  const conflitos = await encontrarConflitos(participantes, scheduledAt, durationMinutes);

  return { conflict: conflitos.length > 0, conflitos };
}

export async function criarAgendamento(
  usuario: AppointmentViewer,
  dados: AppointmentInput,
): Promise<AppointmentRecord> {
  validarInicioFuturo(dados.scheduledAt);

  const participantes = await participantesDoAgendamento(usuario, dados.matchId);
  const conflitos = await encontrarConflitos(participantes, dados.scheduledAt, dados.durationMinutes);

  if (conflitos.length > 0) {
    throw HttpError.conflict('ja existe um compromisso nesse horario', { conflitos });
  }

  const agendamento = await create({
    title: dados.title,
    description: dados.description ? encryptText(dados.description) : undefined,
    scheduledAt: dados.scheduledAt,
    durationMinutes: dados.durationMinutes,
    matchId: dados.matchId,
    createdById: usuario.id,
  });

  return decifrarDescricao(agendamento);
}

export async function alterarStatus(
  id: string,
  status: AppointmentStatus,
  usuario: AppointmentViewer,
): Promise<AppointmentRecord> {
  const agendamento = await findAccess(id);

  if (!agendamento) {
    throw HttpError.notFound('agendamento nao encontrado');
  }

  if (!podeGerenciar(agendamento, usuario)) {
    throw HttpError.forbidden('voce nao pode mudar esse agendamento');
  }

  validarTransicaoStatus(agendamento.status, status);

  return decifrarDescricao(await updateStatus(id, status));
}

export async function removerAgendamento(id: string, usuario: AppointmentViewer): Promise<void> {
  const agendamento = await findAccess(id);

  if (!agendamento) {
    throw HttpError.notFound('agendamento nao encontrado');
  }

  if (!podeGerenciar(agendamento, usuario)) {
    throw HttpError.forbidden('voce nao pode remover esse agendamento');
  }

  await remove(id);
}
