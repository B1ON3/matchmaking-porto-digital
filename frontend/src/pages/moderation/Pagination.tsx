interface PaginationProps {
  total: number;
  pagina: number;
  totalPaginas: number;
  singular: string;
  plural: string;
  onAnterior: () => void;
  onProxima: () => void;
}

export function Pagination({ total, pagina, totalPaginas, singular, plural, onAnterior, onProxima }: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {total} {total === 1 ? singular : plural} · página {pagina} de {totalPaginas}
      </span>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" disabled={pagina <= 1} onClick={onAnterior}>
          Anterior
        </button>
        <button type="button" className="btn-secondary" disabled={pagina >= totalPaginas} onClick={onProxima}>
          Próxima
        </button>
      </div>
    </div>
  );
}
