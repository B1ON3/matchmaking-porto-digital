import type { ReactNode } from 'react';

interface EmptyStateProps {
  titulo: string;
  descricao?: string;
  children?: ReactNode;
}

export function EmptyState({ titulo, descricao, children }: EmptyStateProps) {
  return (
    <div className="card text-center">
      <p className="font-medium text-slate-900">{titulo}</p>
      {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}