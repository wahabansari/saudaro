import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import type { Company } from '@saudaro/api-contracts';
import { enqueueEvent, withTenantContext, type Tx } from '@saudaro/database-utils';
import { ConflictError } from '@saudaro/error-handling';
import { createEvent } from '@saudaro/event-contracts';
import { OWNER_ROLE } from '../../domain/roles.ts';
import { companies, memberships } from '../db/schema.ts';

const SCHEMA = 'company';
/** Upper bound of GET /v1/companies/mine. */
export const MAX_MY_COMPANIES = 100;
const orm = (tx: Tx) => drizzle(tx, { casing: 'snake_case' }); // same casing as drizzle.config.ts

/** Company + owner membership + company.created.v1 outbox row in ONE transaction under the caller's RLS context. */
export function createCompany(
  pool: pg.Pool,
  input: {
    id?: string | undefined;
    userId: string;
    legalName: string;
    countryCode: string;
    correlationId: string;
  },
): Promise<Company> {
  const id = input.id ?? randomUUID();
  return withTenantContext(pool, { userId: input.userId }, async (tx) => {
    const db = orm(tx);
    const inserted = await db
      .insert(companies)
      .values({ id, legalName: input.legalName, countryCode: input.countryCode, createdBy: input.userId })
      .onConflictDoNothing({ target: companies.id })
      .returning({ id: companies.id });
    if (inserted.length === 0) {
      // Retry of an earlier request by the same user returns it unchanged; someone else's id is a generic conflict.
      const [existing] = await db
        .select()
        .from(companies)
        .where(and(eq(companies.id, id), eq(companies.createdBy, input.userId)));
      if (!existing) throw new ConflictError('The company could not be created.');
      return { id, legalName: existing.legalName, countryCode: existing.countryCode, roleKey: OWNER_ROLE };
    }
    await db
      .insert(memberships)
      .values({ companyId: id, userId: input.userId, roleKey: OWNER_ROLE, status: 'active' });
    const event = createEvent('company.created.v1', {
      correlationId: input.correlationId,
      payload: { companyId: id, ownerUserId: input.userId, countryCode: input.countryCode },
    });
    await enqueueEvent(tx, SCHEMA, {
      aggregateType: 'company',
      aggregateId: id,
      eventType: event.type,
      payload: event,
    });
    return { id, legalName: input.legalName, countryCode: input.countryCode, roleKey: OWNER_ROLE };
  });
}

export function listMyCompanies(pool: pg.Pool, userId: string): Promise<Company[]> {
  return withTenantContext(pool, { userId }, (tx) =>
    orm(tx)
      .select({
        id: companies.id,
        legalName: companies.legalName,
        countryCode: companies.countryCode,
        roleKey: memberships.roleKey,
      })
      .from(memberships)
      .innerJoin(companies, eq(companies.id, memberships.companyId))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, 'active')))
      .orderBy(companies.createdAt)
      .limit(MAX_MY_COMPANIES),
  );
}

/** RLS (memberships_own_select) lets the target user's own row through; no system context needed. */
export function findMembership(pool: pg.Pool, companyId: string, userId: string) {
  return withTenantContext(pool, { userId }, async (tx) => {
    const [row] = await orm(tx)
      .select({ status: memberships.status, roleKey: memberships.roleKey })
      .from(memberships)
      .where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId)));
    return row;
  });
}
