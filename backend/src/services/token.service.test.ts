import assert from 'node:assert/strict';
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from 'jsonwebtoken';
import { isTokenError, verifyToken } from './token.service';

assert.equal(isTokenError(new JsonWebTokenError('invalido')), true);
assert.equal(isTokenError(new TokenExpiredError('expirado', new Date())), true);
assert.equal(isTokenError(new NotBeforeError('ainda nao vale', new Date())), true);
assert.equal(isTokenError(new Error('banco fora do ar')), false);
assert.equal(isTokenError(null), false);

try {
  verifyToken('nao-e-um-jwt');
  assert.fail('token invalido deveria falhar');
} catch (erro) {
  assert.equal(isTokenError(erro), true, 'erro do jwt deve ser reconhecido');
}

console.log('token.service: ok');
