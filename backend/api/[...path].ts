import app from '../src/server';

// A Vercel chama a funcao com (req, res) do Node, a mesma assinatura do Express.
// O catch-all preserva o caminho original (/api/...), entao as rotas montadas
// em /api continuam valendo tambem no serverless.
export default app;
