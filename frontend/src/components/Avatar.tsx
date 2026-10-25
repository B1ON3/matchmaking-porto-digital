interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

const CORES = ['bg-laco-600', 'bg-barro-500', 'bg-laco-800', 'bg-areia-600', 'bg-noite-600', 'bg-barro-700'];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return '?';
  }

  return partes
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join('')
    .toUpperCase();
}

function corDoNome(nome: string): string {
  const soma = Array.from(nome).reduce((total, caractere) => total + caractere.charCodeAt(0), 0);
  return CORES[soma % CORES.length];
}

export function Avatar({ name, src, size = 40 }: AvatarProps) {
  const estilo = { width: size, height: size, fontSize: Math.max(11, size * 0.36) };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={estilo}
        className="shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-noite-800"
      />
    );
  }

  return (
    <span
      aria-label={name}
      style={estilo}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-noite-800 ${corDoNome(name)}`}
    >
      {iniciais(name)}
    </span>
  );
}
