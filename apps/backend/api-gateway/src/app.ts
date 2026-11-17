import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { expressMiddleware } from '@as-integrations/express5';
import type { Express } from 'express';
import { buildAllowlist } from '@saudaro/graphql-contracts';
import { formatGraphQLError } from '@saudaro/error-handling';
import type { Logger } from '@saudaro/logger';
import { MetricsRegistry } from '@saudaro/observability';
import { createServiceApp } from '@saudaro/service-kit';
import type { TokenService } from '@saudaro/authentication';
import { createServiceClient } from './clients/services.ts';
import { GATEWAY_VERSION, type GatewayConfig } from './config/env.ts';
import { buildContext, type GatewayContext } from './context/context.ts';
import { resolvers, typeDefs } from './graphql/schema.ts';
import { corsMiddleware, rateLimiter } from './middleware/protection.ts';
import { complexityPlugin, depthPlugin, operationMetricsPlugin, responseSizePlugin } from './plugins/operations.ts';
import { persistedQueries } from './security/persisted-queries.ts';

export interface GatewayDeps {
  config: GatewayConfig;
  logger: Logger;
  tokens: TokenService;
  /** Holds the gateway's own signing key; absent means downstream calls are disabled (DependencyError). */
  serviceTokens?: TokenService;
  metrics?: MetricsRegistry;
  /** Extra readiness checks (downstream services) — added as services are wired. */
  readiness?: () => Promise<void>;
}

export interface Gateway {
  app: Express;
  apollo: ApolloServer<GatewayContext>;
  stop: () => Promise<void>;
}

/**
 * Builds the gateway: Express (service-kit) + Apollo Server on /graphql.
 * Protections, in request order: CORS → rate limit → body size (service-kit) → persisted-query allowlist →
 * Apollo (CSRF prevention, depth limit, complexity limit, introspection policy, error formatting, response cap).
 */
export async function buildGateway(deps: GatewayDeps): Promise<Gateway> {
  const { config, logger, tokens } = deps;
  const metrics = deps.metrics ?? new MetricsRegistry();
  const services = createServiceClient({ config, tokens: deps.serviceTokens });
  const isProd =config.NODE_ENV === 'production';

  const apollo = new ApolloServer<GatewayContext>({
    typeDefs,
    resolvers,
    introspection: config.GRAPHQL_INTROSPECTION,
    csrfPrevention: true,
    allowBatchedHttpRequests: false, // one operation per HTTP request keeps cost accounting exact
    hideSchemaDetailsFromClientErrors: isProd, // no "Did you mean …" schema hints in production
    includeStacktraceInErrorResponses: !isProd,
    plugins: [
      depthPlugin(config.GRAPHQL_MAX_DEPTH),
      isProd || !config.GRAPHQL_INTROSPECTION ? ApolloServerPluginLandingPageDisabled() : ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      complexityPlugin(config.GRAPHQL_MAX_COMPLEXITY),
      operationMetricsPlugin({ metrics, logger, slowMs: config.SLOW_OPERATION_MS }),
      responseSizePlugin(config.MAX_RESPONSE_BYTES),
    ],
    // requestId is stamped on every error by operationMetricsPlugin (formatError has no request context).
    formatError: (formatted, error) => formatGraphQLError(formatted, error, { requestId: 'pending', exposeStack: !isProd }),
  });
  await apollo.start();

  const allowlist = buildAllowlist();
  const app = createServiceApp({
    serviceName: 'api-gateway',
    version: GATEWAY_VERSION,
    logger,
    metrics,
    isDevelopment: !isProd,
    trustProxy: config.TRUST_PROXY,
    bodyLimit: config.MAX_BODY,
    requestTimeoutMs: config.REQUEST_TIMEOUT_MS,
    ...(deps.readiness ? { readiness: deps.readiness } : {}),
    routes: (a) => {
      a.use(
        '/graphql',
        corsMiddleware(config.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)),
        rateLimiter({ windowMs: config.RATE_LIMIT_WINDOW_MS, max: config.RATE_LIMIT_MAX }),
        persistedQueries({ allowlist, enforce: config.GRAPHQL_PERSISTED_ONLY }),
        expressMiddleware(apollo, { context: async ({ req }) => buildContext(req, { tokens, logger, services }) }),
      );
    },
  });

  return { app, apollo, stop: () => apollo.stop() };
}
