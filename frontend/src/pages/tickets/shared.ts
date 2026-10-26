import type { TicketActionType, TicketCategory, TicketPriority, TicketStatus, TrustStatus } from '../../types';

export const ROTULO_CATEGORIA: Record<TicketCategory, string> = {
  GOLPE: 'Golpe ou fraude',
  PERFIL_FALSO: 'Perfil falso',
  ASSEDIO: 'Assédio',
  SPAM: 'Spam',
  DADOS_INCORRETOS: 'Dados incorretos',
  SUPORTE: 'Suporte',
  OUTRO: 'Outro',
};

export const ROTULO_STATUS_CHAMADO: Record<TicketStatus, string> = {
  ABERTO: 'Aberto',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_USUARIO: 'Aguardando você',
  RESOLVIDO: 'Resolvido',
  ARQUIVADO: 'Arquivado',
};

export const CLASSE_STATUS_CHAMADO: Record<TicketStatus, string> = {
  ABERTO: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  EM_ANALISE: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  AGUARDANDO_USUARIO: 'bg-barro-100 text-barro-800 dark:bg-barro-900/30 dark:text-barro-200',
  RESOLVIDO: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  ARQUIVADO: 'bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
};

export const ROTULO_PRIORIDADE: Record<TicketPriority, string> = {
  BAIXA: 'Baixa',
  NORMAL: 'Normal',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

export const CLASSE_PRIORIDADE: Record<TicketPriority, string> = {
  BAIXA: 'bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
  NORMAL: 'bg-laco-50 text-laco-800 dark:bg-laco-900/30 dark:text-laco-200',
  ALTA: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  URGENTE: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export const ROTULO_CONFIANCA: Record<TrustStatus, string> = {
  NAO_AVALIADO: 'Não avaliado',
  CONFIAVEL: 'Confiável',
  SUSPEITO: 'Suspeito',
  GOLPE: 'Golpe confirmado',
};

export const CLASSE_CONFIANCA: Record<TrustStatus, string> = {
  NAO_AVALIADO: 'bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
  CONFIAVEL: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  SUSPEITO: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  GOLPE: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export const ROTULO_ACAO: Record<TicketActionType, string> = {
  ACESSO_AUTORIZADO: 'Acesso ao contexto registrado',
  OBSERVACAO: 'Observação',
  USUARIO_SUSPENSO: 'Conta suspensa',
  USUARIO_REATIVADO: 'Conta reativada',
  PERFIL_OCULTADO: 'Perfil ocultado',
  PERFIL_RESTAURADO: 'Perfil restaurado',
  GOLPE_CONFIRMADO: 'Golpe confirmado',
  GOLPE_DESCARTADO: 'Golpe descartado',
  SUSPEITA_MARCADA: 'Suspeita registrada',
  SUSPEITA_REMOVIDA: 'Suspeita removida',
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

export function descricaoCurta(texto: string, limite = 140): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();

  return limpo.length > limite ? `${limpo.slice(0, limite)}…` : limpo;
}
