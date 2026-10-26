interface AlertProps {
  tipo?: 'erro' | 'sucesso' | 'info';
  mensagem: string;
}

const ESTILOS: Record<NonNullable<AlertProps['tipo']>, string> = {
  erro: 'border-rose-200 bg-rose-50 text-rose-700',
  sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
};

export function Alert({ tipo = 'erro', mensagem }: AlertProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${ESTILOS[tipo]}`} role="alert">
      {mensagem}
    </div>
  );
}
