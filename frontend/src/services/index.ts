import { api } from './api';
import type {
  AdminMetrics,
  AdminOverview,
  AdminUsersPage,
  Appointment,
  AppointmentConflictPreview,
  AuditLog,
  ConversationSummary,
  InvestorInsights,
  Match,
  MatchCompatibility,
  Message,
  MessagePage,
  PrivacyOverview,
  PrivacyPolicy,
  Project,
  ProjectStatus,
  StartupInsights,
  User,
} from '../types';

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

  async forgotPassword(email: string): Promise<{ mensagem: string; token?: string; expiraEm?: string }> {
    const { data } = await api.post<{ mensagem: string; token?: string; expiraEm?: string }>(
      '/v1/auth/forgot-password',
      { email },
    );
    return data;
  },

  async resetPassword(token: string, password: string): Promise<{ mensagem: string }> {
    const { data } = await api.post<{ mensagem: string }>('/v1/auth/reset-password', {
      token,
      password,
    });
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

  async getInsights(id: string) {
    const { data } = await api.get<StartupInsights>(`/v1/startups/${id}/insights`);
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

  async getInsights(id: string) {
    const { data } = await api.get<InvestorInsights>(`/v1/investors/${id}/insights`);
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

  async compatibility(id: string) {
    const { data } = await api.get<MatchCompatibility>(`/v1/matches/${id}/compatibility`);
    return data;
  },

  async updateStatus(id: string, status: 'ACEITO' | 'RECUSADO' | 'PENDENTE') {
    const { data } = await api.put<Match>(`/v1/matches/${id}/status`, { status });
    return data;
  },
};

export const messageService = {
  async list(conversaCom?: string, options?: { before?: string; limit?: number }) {
    const { data } = await api.get<MessagePage>('/v1/messages', {
      params: {
        ...(conversaCom ? { conversaCom } : {}),
        ...(options?.before ? { before: options.before } : {}),
        ...(options?.limit ? { limit: options.limit } : {}),
      },
    });
    return data;
  },

  async conversas() {
    const { data } = await api.get<ConversationSummary[]>('/v1/messages/conversas');
    return data;
  },

  async unreadCount() {
    const { data } = await api.get<{ total: number }>('/v1/messages/nao-lidas');
    return data;
  },

  async markRead(userId: string) {
    const { data } = await api.post<{ updated: number }>(`/v1/messages/conversas/${userId}/read`);
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

  async create(dados: {
    title: string;
    description?: string;
    scheduledAt: string;
    durationMinutes: 30 | 60;
    matchId?: string;
  }) {
    const { data } = await api.post<Appointment>('/v1/appointments', dados);
    return data;
  },

  async conflicts(params: { scheduledAt: string; durationMinutes: 30 | 60; matchId?: string }) {
    const { data } = await api.get<AppointmentConflictPreview>('/v1/appointments/conflicts', { params });
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

export const adminService = {
  async getOverview() {
    const { data } = await api.get<AdminOverview>('/v1/admin/overview');
    return data;
  },

  async listUsers(params?: Record<string, string | number>) {
    const { data } = await api.get<AdminUsersPage>('/v1/admin/users', { params });
    return data;
  },

  async updateUserStatus(id: string, status: 'ATIVO' | 'SUSPENSO', motivo: string) {
    const { data } = await api.patch(`/v1/admin/users/${id}/status`, { status, motivo });
    return data;
  },

  async hideProfile(id: string, motivo?: string) {
    const { data } = await api.post(`/v1/admin/profiles/${id}/hide`, { motivo });
    return data as { id: string; tipo: 'STARTUP' | 'INVESTOR'; hiddenAt: string };
  },

  async restoreProfile(id: string, motivo?: string) {
    const { data } = await api.post(`/v1/admin/profiles/${id}/restore`, { motivo });
    return data as { id: string; tipo: 'STARTUP' | 'INVESTOR'; hiddenAt: null };
  },

  async getMetrics(params: { from: string; to: string; granularity?: 'day' | 'week' }) {
    const { data } = await api.get<AdminMetrics>('/v1/admin/metrics', { params });
    return data;
  },

  async exportMetrics(params: { from: string; to: string; granularity?: 'day' | 'week' }) {
    const resposta = await api.get<Blob>('/v1/admin/metrics/export.csv', {
      params,
      responseType: 'blob',
    });
    const disposicao = String(resposta.headers['content-disposition'] ?? '');
    const nome = /filename="([^"]+)"/.exec(disposicao)?.[1] ?? 'laco-metricas.csv';

    return { blob: resposta.data, filename: nome };
  },
};

export const projectService = {
  async list(startupId: string) {
    const { data } = await api.get<Project[]>(`/v1/startups/${startupId}/projects`);
    return data;
  },

  async create(startupId: string, dados: { title: string; summary?: string; status?: ProjectStatus }) {
    const { data } = await api.post<Project>(`/v1/startups/${startupId}/projects`, dados);
    return data;
  },

  async update(
    startupId: string,
    projectId: string,
    dados: Partial<{ title: string; summary: string; status: ProjectStatus }>,
  ) {
    const { data } = await api.put<Project>(`/v1/startups/${startupId}/projects/${projectId}`, dados);
    return data;
  },

  async remove(startupId: string, projectId: string) {
    await api.delete(`/v1/startups/${startupId}/projects/${projectId}`);
  },
};

export const privacyService = {
  async policy(): Promise<PrivacyPolicy> {
    const { data } = await api.get<PrivacyPolicy>('/v1/privacy/policy');
    return data;
  },

  async overview(): Promise<PrivacyOverview> {
    const { data } = await api.get<PrivacyOverview>('/v1/me/privacy');
    return data;
  },

  async recordConsent(type: 'TERMOS_USO' | 'DADOS_PESSOAIS' | 'COMUNICACOES', granted: boolean) {
    const { data } = await api.post('/v1/me/privacy/consents', { type, granted });
    return data as { mensagem: string };
  },

  async exportData(): Promise<{ blob: Blob; filename: string }> {
    const resposta = await api.get<Blob>('/v1/me/privacy/export', { responseType: 'blob' });
    const disposicao = String(resposta.headers['content-disposition'] ?? '');
    const nome = /filename="([^"]+)"/.exec(disposicao)?.[1] ?? 'laco-portabilidade.json';

    return { blob: resposta.data, filename: nome };
  },

  async deleteAccount(password: string, confirmation: string) {
    const { data } = await api.delete('/v1/me/privacy/account', {
      data: { password, confirmation },
    });

    return data as { mensagem: string };
  },
};
