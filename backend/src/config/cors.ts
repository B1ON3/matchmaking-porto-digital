// A lista de origens vem de CORS_ORIGIN (separada por virgula). Um * cobre
// exatamente um nivel de subdominio, o que atende os previews da Vercel
// (ex.: matchmaking-frontend-git-main-b1on3.vercel.app).
export function criarVerificadorDeOrigem(padroes: string[]) {
  const permitidas = padroes.map((padrao) => padrao.trim()).filter(Boolean);
  const exatas = new Set(permitidas.filter((padrao) => !padrao.includes('*')));
  const regexes = permitidas
    .filter((padrao) => padrao.includes('*'))
    .map((padrao) => {
      const escapado = padrao.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+');

      return new RegExp(`^${escapado}$`);
    });

  // requisicoes sem Origin (curl, server-to-server) nao passam por CORS
  return (origem?: string): boolean => !origem || exatas.has(origem) || regexes.some((regex) => regex.test(origem));
}
