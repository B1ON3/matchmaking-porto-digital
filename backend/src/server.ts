// precisa vir antes de qualquer rota: no express 4 um handler async que
// rejeita nao vai sozinho pro error middleware, ele derruba o processo inteiro
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { criarVerificadorDeOrigem } from './config/cors';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

// Na Vercel a requisicao chega via proxy: sem isso o rate limit usaria o IP do
// proxy para todo mundo. 1 hop e o suficiente.
app.set('trust proxy', 1);

app.use(helmet());

const origemPermitida = criarVerificadorDeOrigem(env.corsOrigin.split(','));

app.use(
  cors({
    origin: (origem, callback) => callback(null, origemPermitida(origem)),
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// todas as rotas da API ficam em /api
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

// na Vercel o app roda como serverless function, entao nao abre porta
if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`API rodando em http://localhost:${env.port}/api`);
  });
}

export default app;
