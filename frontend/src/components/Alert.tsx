interface AlertProps {
  tipo?: 'erro' | 'sucesso';
  mensagem: string;
}

export function Alert({ tipo = 'erro', mensagem }: AlertProps) {
  const estilo =
    tipo === 'erro'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${estilo}`} role="alert">
      {mensagem}
    </div>
  );
}