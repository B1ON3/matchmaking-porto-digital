import { api } from './api';
import type { Appointment, AuditLog, Match, Message, User } from '../types';

interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async register(dados: Record<string, unknown>): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/v1/auth/register', dados);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/v1/auth/login', { email, password });
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>('/v1/auth/me');
    return data;
  },
};

export const startupService = {
  async list(params?: Record<string, string | number>) {
    const { data } = await api.get('/v1/startups', { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await api.get(`/v1/startups/${id}`);
    return data;
  },

  async update(id: string, dados: Record<string, unknown>) {
    const { data } = await api.put(`/v1/startups/${id}`, dados);
    return data;
  },

  async remove(id: string) {
    await api.delete(`/v1/startups/${id}`);
  },
};

export const investorService = {
  async list(params?: Record<string, string | number>) {
    const { data } = await api.get('/v1/investors', { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await api.get(`/v1/investors/${id}`);
    return data;
  },

  async update(id: string, dados: Record<string, unknown>) {
    const { data } = await api.put(`/v1/investors/${id}`, dados);
    return data;
  },

  async remove(id: string) {
    await api.delete(`/v1/investors/${id}`);
  },
};

export const matchService = {
  async list(params?: Record<string, string | number>) {
    const { data } = await api.get<{ matches: Match[]; total: number }>('/v1/matches', { params });
    return data;
  },

  async regenerate(startupId: string) {
    const { data } = await api.post('/v1/matches/gerar', { startupId });
    return data as { mensagem: string; quantidade: number };
  },

  async updateStatus(id: string, status: 'ACEITO' | 'RECUSADO' | 'PENDENTE') {
    const { data } = await api.put<Match>(`/v1/matches/${id}/status`, { status });
    return data;
  },
};

export const messageService = {
  async list(conversaCom?: string) {
    const { data } = await api.get<Message[]>('/v1/messages', {
      params: conversaCom ? { conversaCom } : undefined,
    });
    return data;
  },

  async conversas() {
    const { data } = await api.get('/v1/messages/conversas');
    return data;
  },

  async send(recipientId: string, content: string) {
    const { data } = await api.post<Message>('/v1/messages', { recipientId, content });
    return data;
  },

  async remove(id: string) {
    await api.delete(`/v1/messages/${id}`);
  },
};

export const appointmentService = {
  async list(params?: Record<string, string | number>) {
    const { data } = await api.get<Appointment[]>('/v1/appointments', { params });
    return data;
  },

  async create(dados: { title: string; description?: string; scheduledAt: string }) {
    const { data } = await api.post<Appointment>('/v1/appointments', dados);
    return data;
  },

  async updateStatus(id: string, status: 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO') {
    const { data } = await api.put<Appointment>(`/v1/appointments/${id}/status`, { status });
    return data;
  },

  async remove(id: string) {
    await api.delete(`/v1/appointments/${id}`);
  },
};

export const auditService = {
  async list(params?: Record<string, string | number>) {
    const { data } = await api.get<{ logs: AuditLog[]; total: number }>('/v1/audit', { params });
    return data;
  },

  async remove(id: string) {
    await api.delete(`/v1/audit/${id}`);
  },
};