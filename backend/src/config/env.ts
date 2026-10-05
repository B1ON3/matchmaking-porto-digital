import 'dotenv/config';

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Variavel de ambiente ${key} nao configurada. Copie o .env.example e preencha.`);
  }

  return value;
}

export const env = {
  port: Number(required('PORT', '5000')),
  nodeEnv: required('NODE_ENV', 'development'),
  isProduction: required('NODE_ENV', 'development') === 'production',
  databaseUrl: required('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/matchmaking?schema=public'),
  jwtSecret: required('JWT_SECRET', 'dev-secret-nao-usar-em-producao'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '1d'),
  corsOrigin: required('CORS_ORIGIN', 'http://localhost:3000,https://matchmaking-frontend-ochre.vercel.app'),
};