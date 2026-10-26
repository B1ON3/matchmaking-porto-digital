import assert from 'node:assert/strict';
import { HttpError } from '../utils/http-error';
import { validarMatchParaMensagem } from './conversation.service';

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

console.log('conversation.service: todos os testes passaram');
