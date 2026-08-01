const { generateKeyPairSync } = require('crypto');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { resolve } = require('path');

const keysDir = resolve(__dirname, '..', 'keys');

if (!existsSync(keysDir)) {
  mkdirSync(keysDir, { mode: 0o700 });
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

writeFileSync(resolve(keysDir, 'private.pem'), privateKey, { mode: 0o600 });
writeFileSync(resolve(keysDir, 'public.pem'), publicKey, { mode: 0o644 });

console.log('RSA key pair generated successfully in ./keys/');
console.log('DO NOT commit private.pem to version control.');
