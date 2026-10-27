import type { ReactNode } from 'react';

interface VerifiedBadgeProps {
  /** Data em que o selo foi concedido; quando ausente, o selo não é exibido. */
  verifiedAt?: string | null;
  size?: 'sm' | 'md';
  /** Mostra apenas o ícone, com o texto disponível em title/aria-label. */
  compact?: boolean;
  className?: string;
}

function formatarData(valor: string): string {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return '';
  }

  return data.toLocaleDateString('pt-BR');
}

export function VerifiedBadge({ verifiedAt, size = 'sm', compact = false, className = '' }: VerifiedBadgeProps) {
  if (!verifiedAt) {
    return null;
  }

  const emitidoEm = formatarData(verifiedAt);
  const descricao = emitidoEm
    ? `Perfil verificado pela administração em ${emitidoEm}`
    : 'Perfil verificado pela administração';

  if (compact) {
    return (
      <span
        title={descricao}
        aria-label={descricao}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 ${className}`}
      >
        <IconeSelo />
      </span>
    );
  }

  return (
    <span
      title={descricao}
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30 ${
        size === 'sm' ? 'text-[11px]' : 'text-xs'
      } ${className}`}
    >
      <IconeSelo />
      Perfil verificado
    </span>
  );
}

function IconeSelo(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M10 1.5l2.06 1.28 2.42-.13.94 2.24 2.08 1.24-.62 2.35.62 2.35-2.08 1.24-.94 2.24-2.42-.13L10 18.5l-2.06-1.28-2.42.13-.94-2.24-2.08-1.24.62-2.35-.62-2.35 2.08-1.24.94-2.24 2.42.13L10 1.5zm-1.2 10.7l4.3-4.3-1.06-1.06-3.24 3.24-1.62-1.62-1.06 1.06 2.68 2.68z" />
    </svg>
  );
}
