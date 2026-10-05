interface SpinnerProps {
  texto?: string;
}

export function Spinner({ texto = 'Carregando...' }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-porto-600" />
      <span className="text-sm">{texto}</span>
    </div>
  );
}