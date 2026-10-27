import assert from 'node:assert/strict';
import { resolveDatabaseUrl } from './database-url';

const pooledUrl =
  'postgresql://user:senha@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5';

const serverlessUrl = new URL(resolveDatabaseUrl(pooledUrl, true));

assert.equal(serverlessUrl.searchParams.get('connection_limit'), '1');
assert.equal(serverlessUrl.searchParams.get('pgbouncer'), 'true');
assert.equal(serverlessUrl.searchParams.get('pool_timeout'), '20');

const urlComTimeout = `${pooledUrl}&pool_timeout=7`;
const comTimeout = new URL(resolveDatabaseUrl(urlComTimeout, true));

assert.equal(comTimeout.searchParams.get('pool_timeout'), '7');

assert.equal(resolveDatabaseUrl(pooledUrl, false), pooledUrl);
assert.equal(resolveDatabaseUrl('nao-e-uma-url', true), 'nao-e-uma-url');

console.log('database-url: ok');
