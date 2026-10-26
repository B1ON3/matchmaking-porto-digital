import { app } from './app';
import { env } from './config/env';
import { statusDoKeyring } from './services/encryption.service';

// na Vercel o app roda como serverless function, entao nao abre porta
if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    const criptografia = statusDoKeyring();

    console.log(`API rodando em http://localhost:${env.port}/api`);
    console.log(
      criptografia.configurada
        ? `Criptografia ativa: ${criptografia.kidAtivo} (${criptografia.kids} chave(s) no keyring)`
        : `Criptografia DESATIVADA: configure ${criptografia.variavel}`,
    );
  });
}

export default app;
