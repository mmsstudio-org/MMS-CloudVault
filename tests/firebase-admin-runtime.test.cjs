const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Run with require(esm) disabled: this reproduces the deployed function's loader.
test('Firebase Admin Auth and App Check load without native require(esm)', () => {
  assert.equal(typeof require('firebase-admin/auth').getAuth, 'function');
  assert.equal(typeof require('firebase-admin/app-check').getAppCheck, 'function');
});

test('scoped JOSE dependency retrieves usable RSA, EC and Ed25519 signing keys', async () => {
  const jwksClient = require('jwks-rsa');
  const variants = [
    ['rsa', { modulusLength: 2048 }, 'RS256', 'sha256'],
    ['ec', { namedCurve: 'prime256v1' }, 'ES256', 'sha256'],
    ['ed25519', {}, 'EdDSA', null],
  ];
  for (const [type, options, alg, digest] of variants) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync(type, options);
    const client = jwksClient({
      jwksUri: 'https://unused.invalid', cache: false, rateLimit: false,
      getKeysInterceptor: async () => [{ ...publicKey.export({ format: 'jwk' }), kid: alg, alg, use: 'sig' }],
    });
    const key = await client.getSigningKey(alg);
    const payload = Buffer.from('runtime compatibility test');
    const signature = crypto.sign(digest, payload, privateKey);
    assert.equal(crypto.verify(digest, payload, key.getPublicKey(), signature), true, alg);
    assert.equal(crypto.verify(digest, Buffer.from('tampered'), key.getPublicKey(), signature), false, alg);
  }
});
