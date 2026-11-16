import assert from 'node:assert/strict';
import { HttpError } from '../utils/http-error';
import { ladoDoUsuario, validarMatchParaMensagem } from './conversation.service';

assert.throws(
  () => validarMatchParaMensagem(null),
  (erro: unknown) => erro instanceof HttpError && erro.statusCode === 403,
  'mensagem sem match deve ser bloqueada',
);

assert.throws(
  () => validarMatchParaMensagem({ status: 'RECUSADO' }),
  (erro: unknown) => erro instanceof HttpError && erro.statusCode === 403,
  'match recusado nao pode receber novas mensagens',
);

assert.doesNotThrow(() => validarMatchParaMensagem({ status: 'PENDENTE' }));
assert.doesNotThrow(() => validarMatchParaMensagem({ status: 'ACEITO' }));

const conversa = { senderId: 'remetente', recipientId: 'destinatario' };

assert.equal(ladoDoUsuario(conversa, 'remetente'), 'REMETENTE', 'quem enviou e o remetente');
assert.equal(ladoDoUsuario(conversa, 'destinatario'), 'DESTINATARIO', 'quem recebeu e o destinatario');

assert.throws(
  () => ladoDoUsuario(conversa, 'intruso'),
  (erro: unknown) => erro instanceof HttpError && erro.statusCode === 403,
  'quem nao participa da conversa nao pode mexer na mensagem',
);

console.log('conversation.service: todos os testes passaram');
