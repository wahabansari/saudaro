import { randomUUID } from 'node:crypto';
import { z } from 'zod';

/**
 * Versioned event contracts. Payloads are MINIMAL (ids and facts consumers cannot derive): no personal data,
 * no documents, no free text. Consumers fetch details through the owning service's internal API.
 * Breaking changes require a NEW type version (`*.v2`); old versions are published in parallel until retired.
 */
const id = z.uuid();

export const envelopeSchema = z.object({
  eventId: id,
  type: z.string().regex(/^[a-z]+(\.[a-z_]+)+\.v\d+$/),
  schemaVersion: z.number().int().min(1),
  occurredAt: z.iso.datetime(),
  producer: z.string().min(1).max(64),
  correlationId: z.string().min(1).max(128),
  causationId: z.string().min(1).max(128).optional(),
  payload: z.unknown(),
});

export const EVENTS = {
  'user.registered.v1': {
    producer: 'identity-service',
    payload: z.object({ userId: id, locale: z.string().max(10) }),
  },
  'company.created.v1': {
    producer: 'company-service',
    payload: z.object({ companyId: id, ownerUserId: id, countryCode: z.string().regex(/^[A-Z]{2}$/) }),
  },
  'company.verified.v1': {
    producer: 'verification-service',
    payload: z.object({ companyId: id, level: z.string().max(40), verifiedAt: z.iso.datetime() }),
  },
  'product.published.v1': {
    producer: 'catalog-service',
    payload: z.object({ productId: id, companyId: id, categoryId: id }),
  },
  'rfq.published.v1': {
    producer: 'rfq-service',
    payload: z.object({
      rfqId: id,
      buyerCompanyId: id,
      categoryId: id,
      visibility: z.enum(['public', 'private', 'invited']),
      expiresAt: z.iso.datetime(),
    }),
  },
  'supplier.match.created.v1': {
    producer: 'matching-service',
    payload: z.object({ matchId: id, rfqId: id, supplierCompanyId: id, score: z.number().min(0).max(100) }),
  },
  'quotation.submitted.v1': {
    producer: 'quotation-service',
    payload: z.object({
      quotationId: id,
      rfqId: id,
      supplierCompanyId: id,
      buyerCompanyId: id,
      revisionNo: z.number().int().min(1),
    }),
  },
  'quotation.accepted.v1': {
    producer: 'quotation-service',
    payload: z.object({
      quotationId: id,
      rfqId: id,
      revisionId: id,
      supplierCompanyId: id,
      buyerCompanyId: id,
      /** SHA-256 of the canonical accepted revision: the Deal Service verifies its fetched snapshot against it. */
      contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    }),
  },
  'deal.created.v1': {
    producer: 'deal-service',
    payload: z.object({ dealId: id, quotationId: id, buyerCompanyId: id, supplierCompanyId: id }),
  },
  'message.created.v1': {
    producer: 'messaging-service',
    payload: z.object({ messageId: id, conversationId: id, senderCompanyId: id }),
  },
  'deal.completed.v1': {
    producer: 'deal-service',
    payload: z.object({ dealId: id, buyerCompanyId: id, supplierCompanyId: id }),
  },
} as const;

export type EventType = keyof typeof EVENTS;
export type EventPayload<T extends EventType> = z.infer<(typeof EVENTS)[T]['payload']>;
export interface EventEnvelope<T extends EventType = EventType> {
  eventId: string;
  type: T;
  schemaVersion: number;
  occurredAt: string;
  producer: string;
  correlationId: string;
  causationId?: string;
  payload: EventPayload<T>;
}

export const isEventType = (t: string): t is EventType => Object.hasOwn(EVENTS, t);
const versionOf = (type: string): number => Number(type.slice(type.lastIndexOf('.v') + 2));

/** Builds a validated envelope. Throws if the payload does not satisfy the contract. */
export function createEvent<T extends EventType>(
  type: T,
  input: {
    correlationId: string;
    causationId?: string;
    payload: EventPayload<T>;
    now?: Date;
    eventId?: string;
  },
): EventEnvelope<T> {
  const spec = EVENTS[type];
  const payload = spec.payload.parse(input.payload) as EventPayload<T>;
  return {
    eventId: input.eventId ?? randomUUID(),
    type,
    schemaVersion: versionOf(type),
    occurredAt: (input.now ?? new Date()).toISOString(),
    producer: spec.producer,
    correlationId: input.correlationId,
    ...(input.causationId ? { causationId: input.causationId } : {}),
    payload,
  };
}

/** Validates an untrusted message from the broker: envelope, known type, and payload schema. */
export function parseEvent(raw: unknown): EventEnvelope {
  const env = envelopeSchema.parse(raw);
  if (!isEventType(env.type)) throw new Error(`unknown event type "${env.type}"`);
  const spec = EVENTS[env.type];
  if (env.producer !== spec.producer) throw new Error(`event "${env.type}" has unexpected producer`);
  return { ...env, type: env.type, payload: spec.payload.parse(env.payload) } as EventEnvelope;
}

/** RabbitMQ routing key == event type; consumers bind with patterns such as `rfq.*.v1`. */
export const routingKey = (type: EventType): string => type;
export const EVENT_EXCHANGE = 'saudaro.events';
