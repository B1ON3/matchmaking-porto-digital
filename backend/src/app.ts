// precisa vir antes de qualquer rota: no express 4 um handler async que
// rejeita nao vai sozinho pro error middleware, ele derruba o processo inteiro
import 'express-async-errors';

import express from 'express';
import type { Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { criarVerificadorDeOrigem } from './config/cors';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const app = express();

// Na Vercel a requisicao chega via proxy: sem isso o rate limit usaria o IP do
// proxy para todo mundo. 1 hop e o suficiente.
app.set('trust proxy', 1);

app.use(
  helmet({
    hsts: env.isProduction ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
  }),
);

const origemPermitida = criarVerificadorDeOrigem(env.corsOrigin.split(','));

app.use(
  cors({
    origin: (origem, callback) => callback(null, origemPermitida(origem)),
  }),
);
app.use(express.json({ limit: '1mb' }));
morgan.token('path', (req: Request) => req.originalUrl.split('?')[0]);
app.use(
  morgan(
    env.isProduction
      ? ':method :path :status :res[content-length] - :response-time ms'
      : ':method :path :status :response-time ms',
  ),
);

// todas as rotas da API ficam em /api
app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
