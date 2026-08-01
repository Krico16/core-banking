import { Global, Module } from '@nestjs/common';
import { TOKEN_VERIFIER } from '../domain/ports/token-verifier.port';
import { Rs256TokenVerifier } from './auth/rs256-token-verifier';

@Global()
@Module({
  providers: [Rs256TokenVerifier, { provide: TOKEN_VERIFIER, useExisting: Rs256TokenVerifier }],
  exports: [Rs256TokenVerifier, TOKEN_VERIFIER],
})
export class InfrastructureModule {}
