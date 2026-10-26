import type { AdminMetricsTopItem, AdminUser, UserRole, UserStatus } from '../../types';

export const ROTULO_PAPEL: Record<UserRole, string> = {
  STARTUP: 'Startup',
  INVESTOR: 'Investidor',
  MENTOR: 'Mentor',
  ADMIN: 'Administrador',
};

export const ROTULO_STATUS: Record<UserStatus, string> = {
  ATIVO: 'Ativo',
  SUSPENSO: 'Suspenso',
  EXCLUIDO: 'Excluído',
};

export const CLASSE_STATUS: Record<UserStatus, string> = {
  ATIVO: 'badge bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  SUSPENSO: 'badge bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  EXCLUIDO: 'badge bg-slate-200 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
};

export function dataHora(iso?: string | null): string {
  if (!iso) {
    return '—';
  }

  const data = new Date(iso);

  if (Number.isNaN(data.getTime())) {
    return '—';
  }

  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function dataCurta(bucket: string): string {
  return new Date(`${bucket}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function formatarDetalhes(detalhes?: string | null): string {
  if (!detalhes) {
    return '—';
  }

  try {
    const parsed = JSON.parse(detalhes) as Record<string, unknown>;

    return Object.entries(parsed)
      .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
      .map(([chave, valor]) => `${chave}: ${String(valor)}`)
      .join(' · ');
  } catch {
    return detalhes;
  }
}

export function perfilDoUsuario(usuario: AdminUser) {
  if (usuario.startupProfile) {
    return {
      id: usuario.startupProfile.id,
      tipo: 'STARTUP' as const,
      nome: usuario.startupProfile.companyName ?? usuario.name,
      oculto: Boolean(usuario.startupProfile.hiddenAt),
    };
  }

  if (usuario.investorProfile) {
    return {
      id: usuario.investorProfile.id,
      tipo: 'INVESTOR' as const,
      nome: usuario.investorProfile.companyName ?? usuario.name,
      oculto: Boolean(usuario.investorProfile.hiddenAt),
    };
  }

  return null;
}

function dataIsoLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

export function intervaloDoPeriodo(dias: number) {
  const hoje = new Date();
  const inicio = new Date(hoje);

  inicio.setDate(inicio.getDate() - (dias - 1));

  return {
    from: dataIsoLocal(inicio),
    to: dataIsoLocal(hoje),
    granularity: dias > 30 ? ('week' as const) : ('day' as const),
  };
}

export function resumoPorPapel(itens: { role: UserRole; count: number }[]): string {
  return itens
    .filter((item) => item.count > 0)
    .map((item) => `${ROTULO_PAPEL[item.role]} ${item.count}`)
    .join(' · ');
}

export function maximoDe(itens: AdminMetricsTopItem[]): number {
  return Math.max(...itens.map((item) => item.count), 1);
}
