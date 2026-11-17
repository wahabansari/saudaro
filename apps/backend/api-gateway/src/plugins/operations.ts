import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError, Kind, getOperationAST, type DocumentNode, type FragmentDefinitionNode, type SelectionSetNode, type ValueNode } from 'graphql';
import type { Logger } from '@saudaro/logger';
import type { MetricsRegistry } from '@saudaro/observability';
import type { GatewayContext } from '../context/context.ts';
import { maxDepthOf } from '../graphql/depth-limit.ts';

/**
 * Cost estimator: a list/connection field costs `first × child cost`, so a query asking for 100 items
 * with nested lists is priced accordingly. Everything else costs 1 per field.
 */
export const connectionEstimator = ({ args, childComplexity }: { args: Record<string, unknown>; childComplexity: number }): number | void => {
  const first = args.first;
  if (typeof first === 'number' && first > 0) return 1 + first * Math.max(childComplexity, 1);
  return undefined;
};

function intArg(value: ValueNode | undefined, variables: Record<string, unknown>): number | undefined {
  if (!value) return undefined;
  if (value.kind === Kind.INT) return Number(value.value);
  if (value.kind === Kind.VARIABLE) {
    const v = variables[value.name.value];
    return typeof v === 'number' ? v : undefined;
  }
  return undefined;
}

function selectionCost(
  set: SelectionSetNode,
  fragments: Map<string, FragmentDefinitionNode>,
  variables: Record<string, unknown>,
  seen: Set<string>,
): number {
  let total = 0;
  for (const sel of set.selections) {
    if (sel.kind === Kind.FIELD) {
      if (sel.name.value.startsWith('__')) continue; // introspection is governed by its own policy
      const child = sel.selectionSet ? selectionCost(sel.selectionSet, fragments, variables, seen) : 0;
      const first = intArg(sel.arguments?.find((a) => a.name.value === 'first')?.value, variables);
      total += (first !== undefined ? connectionEstimator({ args: { first }, childComplexity: child }) : undefined) ?? 1 + child;
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      total += selectionCost(sel.selectionSet, fragments, variables, seen);
    } else if (sel.kind === Kind.FRAGMENT_SPREAD) {
      const name = sel.name.value;
      const fragment = fragments.get(name);
      if (fragment && !seen.has(name)) total += selectionCost(fragment.selectionSet, fragments, variables, new Set(seen).add(name));
    }
  }
  return total;
}

/**
 * Estimated cost of an operation. Implemented here (not via graphql-query-complexity) on purpose: that
 * package is CommonJS and loads a SECOND copy of `graphql`, which breaks `instanceof` checks against the
 * schema ("dual package hazard"). Fields cost 1 + children; a field with `first: N` costs 1 + N × children.
 */
export function estimateComplexity(document: DocumentNode, operationName: string | null | undefined, variables: Record<string, unknown> = {}): number {
  const op = getOperationAST(document, operationName);
  if (!op) return 0;
  const fragments = new Map<string, FragmentDefinitionNode>();
  for (const def of document.definitions) if (def.kind === Kind.FRAGMENT_DEFINITION) fragments.set(def.name.value, def);
  return selectionCost(op.selectionSet, fragments, variables, new Set());
}

/**
 * Rejects operations nested deeper than `max` BEFORE execution. Runs as a plugin (not a validation rule)
 * because Apollo replaces the `extensions.code` of validation-phase errors, and clients need the stable
 * QUERY_TOO_DEEP code.
 */
export function depthPlugin(max: number): ApolloServerPlugin<GatewayContext> {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation({ request, document }) {
          const depth = maxDepthOf(document, request.operationName);
          if (depth > max) {
            throw new GraphQLError(`The query is nested too deeply (depth ${depth}, maximum ${max}).`, {
              extensions: { code: 'QUERY_TOO_DEEP', http: { status: 400 } },
            });
          }
        },
      };
    },
  };
}

/** Rejects operations whose estimated cost exceeds `max` BEFORE execution. */
export function complexityPlugin(max: number): ApolloServerPlugin<GatewayContext> {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation({ request, document }) {
          const complexity = estimateComplexity(document, request.operationName, request.variables ?? {});
          if (complexity > max) {
            throw new GraphQLError(`The query is too expensive (cost ${complexity}, maximum ${max}). Request fewer fields or a smaller page.`, {
              extensions: { code: 'QUERY_TOO_COMPLEX', http: { status: 400 } },
            });
          }
        },
      };
    },
  };
}

/** Per-operation latency + error metrics and slow-operation logging. Operation NAME only (low cardinality). */
export function operationMetricsPlugin(opts: { metrics: MetricsRegistry; logger: Logger; slowMs: number }): ApolloServerPlugin<GatewayContext> {
  const duration = opts.metrics.histogram('graphql_operation_duration_seconds', 'GraphQL operation latency', ['operation']);
  const errors = opts.metrics.counter('graphql_errors_total', 'GraphQL errors by stable code', ['code']);
  return {
    async requestDidStart() {
      const start = process.hrtime.bigint();
      return {
        async willSendResponse({ request, response, contextValue }) {
          const seconds = Number(process.hrtime.bigint() - start) / 1e9;
          const operation = request.operationName && /^[A-Za-z_][A-Za-z0-9_]{0,60}$/.test(request.operationName) ? request.operationName : 'anonymous';
          duration.observe(seconds, { operation });
          if (response.body.kind === 'single') {
            for (const e of response.body.singleResult.errors ?? []) {
              errors.inc({ code: String(e.extensions?.code ?? 'UNKNOWN') });
              // The request id is part of EVERY error (one consistent structure).
              (e as { extensions?: Record<string, unknown> }).extensions = { ...(e.extensions ?? {}), requestId: contextValue.requestId };
            }
          }
          if (seconds * 1000 > opts.slowMs) {
            opts.logger.warn({ requestId: contextValue.requestId, operation, durationMs: Math.round(seconds * 1000) }, 'slow GraphQL operation');
          }
        },
      };
    },
  };
}

/** Replaces a response larger than `maxBytes` with a typed error (protects clients and the gateway). */
export function responseSizePlugin(maxBytes: number): ApolloServerPlugin<GatewayContext> {
  return {
    async requestDidStart() {
      return {
        async willSendResponse({ response }) {
          if (response.body.kind !== 'single') return;
          if (Buffer.byteLength(JSON.stringify(response.body.singleResult.data ?? null)) > maxBytes) {
            response.body.singleResult = {
              errors: [new GraphQLError('The response is too large. Request fewer fields or a smaller page.', { extensions: { code: 'RESPONSE_TOO_LARGE' } }).toJSON()],
            };
          }
        },
      };
    },
  };
}
