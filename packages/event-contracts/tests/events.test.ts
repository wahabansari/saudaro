import { describe, expect, it } from 'vitest';
import { EVENTS, createEvent, parseEvent, type EventType } from '../src/index.ts';

const id = (n: number) =>
  `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;

const samples: { [K in EventType]: unknown } = {
  'user.registered.v1': { userId: id(1), locale: 'en' },
  'company.created.v1': { companyId: id(2), ownerUserId: id(1), countryCode: 'PK' },
  'company.verified.v1': {
    companyId: id(2),
    level: 'business_registration',
    verifiedAt: '2026-11-17T10:00:00.000Z',
  },
  'product.published.v1': { productId: id(3), companyId: id(2), categoryId: id(4) },
  'rfq.published.v1': {
    rfqId: id(5),
    buyerCompanyId: id(2),
    categoryId: id(4),
    visibility: 'public',
    expiresAt: '2026-12-01T00:00:00.000Z',
  },
  'supplier.match.created.v1': { matchId: id(6), rfqId: id(5), supplierCompanyId: id(7), score: 87.5 },
  'quotation.submitted.v1': {
    quotationId: id(8),
    rfqId: id(5),
    supplierCompanyId: id(7),
    buyerCompanyId: id(2),
    revisionNo: 1,
  },
  'quotation.accepted.v1': {
    quotationId: id(8),
    rfqId: id(5),
    revisionId: id(9),
    supplierCompanyId: id(7),
    buyerCompanyId: id(2),
    contentHash: 'a'.repeat(64),
  },
  'deal.created.v1': { dealId: id(1), quotationId: id(8), buyerCompanyId: id(2), supplierCompanyId: id(7) },
  'message.created.v1': { messageId: id(3), conversationId: id(4), senderCompanyId: id(2) },
  'deal.completed.v1': { dealId: id(1), buyerCompanyId: id(2), supplierCompanyId: id(7) },
};

describe('event contracts', () => {
  it('defines exactly the eleven required events', () => {
    expect(Object.keys(EVENTS).sort()).toEqual(Object.keys(samples).sort());
    expect(Object.keys(EVENTS)).toHaveLength(11);
  });

  it.each(Object.keys(samples) as EventType[])(
    '%s: createEvent → parseEvent round-trips with a full envelope',
    (type) => {
      const ev = createEvent(type, {
        correlationId: 'corr-1',
        causationId: 'cause-1',
        payload: samples[type] as never,
      });
      expect(ev).toMatchObject({
        type,
        schemaVersion: 1,
        producer: EVENTS[type].producer,
        correlationId: 'corr-1',
        causationId: 'cause-1',
      });
      expect(ev.eventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(parseEvent(JSON.parse(JSON.stringify(ev)))).toEqual(ev);
    },
  );

  it('rejects invalid payloads, unknown types and wrong producers', () => {
    expect(() =>
      createEvent('company.created.v1', { correlationId: 'c', payload: { companyId: 'x' } as never }),
    ).toThrow();
    const good = createEvent('deal.completed.v1', {
      correlationId: 'c',
      payload: samples['deal.completed.v1'] as never,
    });
    expect(() => parseEvent({ ...good, type: 'nope.created.v1' })).toThrow(/unknown event type/);
    expect(() => parseEvent({ ...good, producer: 'evil-service' })).toThrow(/producer/);
    expect(() => parseEvent({ ...good, payload: { dealId: 'bad' } })).toThrow();
    expect(() => parseEvent('garbage')).toThrow();
  });

  it('payloads stay minimal: no free text or personal data fields', () => {
    const all = JSON.stringify(samples);
    for (const forbidden of ['email', 'password', 'phone', 'address', 'body', 'name'])
      expect(all).not.toContain(`"${forbidden}"`);
  });
});
