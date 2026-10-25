import { env } from '../config/env';

// Nao ha provedor de e-mail configurado no projeto. Em desenvolvimento o token
// vai para o log do servidor (e para a resposta da API, para testar o fluxo).
// Em producao, plugue SMTP/Resend/SES aqui antes de expor a rota.
export async function enviarEmailRedefinicao(destino: string, token: string, expiraEm: Date): Promise<void> {
  if (env.isProduction) {
    console.warn('[reset] provedor de e-mail nao configurado: token gerado para %s mas nao enviado', destino);
    return;
  }

  console.info('[reset] token para %s: %s (expira em %s)', destino, token, expiraEm.toISOString());
}
