import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptToken, encryptToken } from './tokenCrypto';

test('encrypts and decrypts provider tokens', () => {
  process.env.TOKEN_ENCRYPTION_KEY = 'test-only-encryption-key';
  const encrypted = encryptToken('provider-secret-token');

  assert.notEqual(encrypted, 'provider-secret-token');
  assert.equal(decryptToken(encrypted), 'provider-secret-token');
});

test('continues to read legacy plaintext tokens', () => {
  assert.equal(decryptToken('legacy-token'), 'legacy-token');
});
