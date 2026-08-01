import { generateKeyPairSync } from 'crypto';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { Rs256TokenVerifier } from './rs256-token-verifier';
import { InvalidTokenError } from '../../domain/errors/invalid-token.error';

const ISSUER = 'banking-auth-service';
const AUDIENCE = 'banking-platform';

function fakeConfigService(publicKeyPath: string): ConfigService {
  return {
    getOrThrow: () => publicKeyPath,
    get: (key: string) => (key === 'jwt.issuer' ? ISSUER : AUDIENCE),
  } as unknown as ConfigService;
}

describe('Rs256TokenVerifier', () => {
  let publicKeyPath: string;
  let privateKey: string;

  beforeAll(() => {
    const { publicKey, privateKey: priv } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKey = priv;
    const dir = mkdtempSync(join(tmpdir(), 'gw-jwt-'));
    publicKeyPath = join(dir, 'public.pem');
    writeFileSync(publicKeyPath, publicKey);
  });

  function signToken(overrides: Partial<jwt.SignOptions & { payload: object }> = {}) {
    const { payload, ...options } = overrides;
    return jwt.sign(
      { sub: 'user_1', email: 'a@b.com', roles: ['customer'], scopes: ['payment:create'], ...payload },
      privateKey,
      {
        algorithm: 'RS256',
        issuer: ISSUER,
        audience: AUDIENCE,
        expiresIn: '15m',
        ...options,
      },
    );
  }

  it('verifies a valid token and returns the decoded claims', () => {
    const verifier = new Rs256TokenVerifier(fakeConfigService(publicKeyPath));
    const token = signToken();

    const decoded = verifier.verify(token);

    expect(decoded.sub).toBe('user_1');
    expect(decoded.roles).toEqual(['customer']);
    expect(decoded.scopes).toEqual(['payment:create']);
  });

  it('rejects a token signed with a different key', () => {
    const { privateKey: otherKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const verifier = new Rs256TokenVerifier(fakeConfigService(publicKeyPath));
    const tamperedToken = jwt.sign({ sub: 'user_1' }, otherKey, {
      algorithm: 'RS256',
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    expect(() => verifier.verify(tamperedToken)).toThrow(InvalidTokenError);
  });

  it('rejects an expired token', () => {
    const verifier = new Rs256TokenVerifier(fakeConfigService(publicKeyPath));
    const token = signToken({ expiresIn: '-1s' });

    expect(() => verifier.verify(token)).toThrow(InvalidTokenError);
  });

  it('rejects a token with the wrong issuer', () => {
    const verifier = new Rs256TokenVerifier(fakeConfigService(publicKeyPath));
    const token = signToken({ issuer: 'someone-else' });

    expect(() => verifier.verify(token)).toThrow(InvalidTokenError);
  });

  it('rejects a token with the wrong audience', () => {
    const verifier = new Rs256TokenVerifier(fakeConfigService(publicKeyPath));
    const token = signToken({ audience: 'someone-else' });

    expect(() => verifier.verify(token)).toThrow(InvalidTokenError);
  });

  it('throws at construction time when the public key file does not exist', () => {
    expect(() => new Rs256TokenVerifier(fakeConfigService('/nonexistent/public.pem'))).toThrow();
  });
});
