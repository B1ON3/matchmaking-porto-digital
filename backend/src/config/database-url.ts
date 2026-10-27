// Na Vercel cada instancia da funcao abre o proprio pool. Com o pooler do
// Supabase (porta 6543) varias instancias simultaneas esgotam as conexoes do
// plano e o Prisma passa a falhar com timeout. Uma conexao por instancia evita
// que um pico de trafego derrube login e rotas autenticadas.
const SERVERLESS_CONNECTION_LIMIT = 1;
const SERVERLESS_POOL_TIMEOUT_SECONDS = 20;

export function resolveDatabaseUrl(rawUrl: string, isServerless: boolean): string {
  if (!isServerless) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);

    url.searchParams.set('connection_limit', String(SERVERLESS_CONNECTION_LIMIT));

    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', String(SERVERLESS_POOL_TIMEOUT_SECONDS));
    }

    return url.toString();
  } catch {
    // URL invalida: deixa o Prisma reportar o erro original na inicializacao
    return rawUrl;
  }
}
