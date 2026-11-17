import { TokenService, type SigningKeyPair } from '@saudaro/authentication';
import { createLogger } from '@saudaro/logger';
import { initTelemetry } from '@saudaro/observability';
import { serve } from '@saudaro/service-kit';
import type { JWK } from 'jose';
import { buildGateway } from './app.ts';
import { GATEWAY_VERSION, loadGatewayConfig, type GatewayConfig } from './config/env.ts';

/** Signs service-to-service tokens with the gateway's own key; it verifies nothing with it. */
function gatewayTokenService(rawJwk: string, config: GatewayConfig): TokenService {
  const privateJwk = JSON.parse(rawJwk) as JWK;
  if (!privateJwk.kid) throw new Error('GATEWAY_SIGNING_JWK must include a kid');
  const signingKey: SigningKeyPair = { kid: privateJwk.kid, privateJwk, publicJwk: {} };
  return new TokenService({ issuer: config.AUTH_ISSUER, audience: config.AUTH_AUDIENCE, signingKey, verificationKeys: [] });
}

async function main(): Promise<void> {
  const config = loadGatewayConfig();
  const telemetry = await initTelemetry({
    serviceName: 'api-gateway',
    serviceVersion: GATEWAY_VERSION,
    otlpEndpoint: config.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
  const logger = createLogger({ service: 'api-gateway', level: config.LOG_LEVEL, version: GATEWAY_VERSION });

  // The gateway only VERIFIES tokens (public keys); it holds no signing key.
  const tokens = new TokenService({ issuer: config.AUTH_ISSUER, audience: config.AUTH_AUDIENCE, verificationKeys: config.AUTH_PUBLIC_JWKS as JWK[] });

  if (config.NODE_ENV === 'production' && !config.GATEWAY_SIGNING_JWK) throw new Error('GATEWAY_SIGNING_JWK is required in production');
  const serviceTokens = config.GATEWAY_SIGNING_JWK ? gatewayTokenService(config.GATEWAY_SIGNING_JWK, config) : undefined;

  const gateway = await buildGateway({ config, logger, tokens, ...(serviceTokens ? { serviceTokens } : {}) });
  await serve(gateway.app, {
    host: config.HOST,
    port: config.PORT,
    logger,
    installSignalHandlers: true,
    onShutdown: async () => {
      await gateway.stop();
      await telemetry.shutdown();
    },
  });
}

main().catch((err: unknown) => {
  // Logger may not exist yet (invalid env): write one safe line.
  process.stderr.write(`gateway startup failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
