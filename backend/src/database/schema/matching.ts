import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, numeric, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';
import { createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tenantFk, tstz } from './_helpers.ts';
import { companies } from './companies.ts';
import { rfqs } from './rfq.ts';
import { countries, productCategories } from './reference.ts';

/**
 * Supplier matching. Scores/reasons are EXPLAINABLE ADVISORY data only: eligibility to see or
 * quote an RFQ is decided by RLS/visibility rules, never by a score. Runs/matches are written by
 * the worker role; buyers see matches for their RFQs (company ids + score + rank), suppliers see
 * only their own matches and reasons (reasons reference private supplier data such as capacity).
 */

export const MATCH_RUN_STATUS = ['queued', 'running', 'completed', 'failed'] as const;
export const rfqMatchRuns = pgTable(
  'rfq_match_runs',
  {
    id: pk(),
    rfqId: uuid().notNull(),
    companyId: uuid().notNull(), // buyer company (tenant)
    status: enumText(MATCH_RUN_STATUS).notNull().default('queued'),
    algorithmVersion: text().notNull(),
    candidateCount: integer(),
    error: text(),
    startedAt: tstz(),
    finishedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('rfq_match_runs_rfq_fk', [t.rfqId, t.companyId], () => [rfqs.id, rfqs.companyId]),
    unique('ux_rfq_match_runs_id_company').on(t.id, t.companyId),
    check('rfq_match_runs_status_chk', oneOf(t.status, MATCH_RUN_STATUS)),
    index('ix_rfq_match_runs_rfq').on(t.rfqId, t.createdAt.desc()),
    index('ix_rfq_match_runs_queue').on(t.createdAt).where(sql`${t.status} = 'queued'`),
  ],
);

export const MATCH_STATUS = ['suggested', 'notified', 'viewed', 'dismissed', 'quoted'] as const;
export const rfqSupplierMatches = pgTable(
  'rfq_supplier_matches',
  {
    id: pk(),
    matchRunId: uuid().notNull(),
    rfqId: uuid().notNull(),
    buyerCompanyId: uuid().notNull(),
    supplierCompanyId: fk(() => companies.id, 'cascade'),
    score: numeric({ precision: 6, scale: 3 }).notNull(),
    rank: integer().notNull(),
    isEligible: boolean().notNull(),
    status: enumText(MATCH_STATUS).notNull().default('suggested'),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('rfq_supplier_matches_run_fk', [t.matchRunId, t.buyerCompanyId], () => [rfqMatchRuns.id, rfqMatchRuns.companyId]),
    tenantFk('rfq_supplier_matches_rfq_fk', [t.rfqId, t.buyerCompanyId], () => [rfqs.id, rfqs.companyId]),
    unique('ux_rfq_supplier_matches_id_supplier').on(t.id, t.supplierCompanyId),
    unique('ux_rfq_supplier_matches_run_supplier').on(t.matchRunId, t.supplierCompanyId),
    check('rfq_supplier_matches_score_chk', sql`${t.score} between 0 and 100`),
    check('rfq_supplier_matches_status_chk', oneOf(t.status, MATCH_STATUS)),
    check('rfq_supplier_matches_not_self_chk', sql`${t.supplierCompanyId} <> ${t.buyerCompanyId}`),
    index('ix_rfq_supplier_matches_supplier').on(t.supplierCompanyId, t.status, t.createdAt.desc()),
    index('ix_rfq_supplier_matches_rfq_rank').on(t.rfqId, t.rank),
  ],
);

export const rfqMatchReasons = pgTable(
  'rfq_match_reasons',
  {
    id: pk(),
    matchId: uuid().notNull(),
    supplierCompanyId: uuid().notNull(), // tenant of the (private) supplier data compared
    reasonCode: text().notNull(), // category_match, hs_match, moq_ok, capacity_ok, incoterm_ok, ...
    passed: boolean().notNull(),
    weight: numeric({ precision: 6, scale: 3 }).notNull(),
    detail: text(),
  },
  (t) => [
    tenantFk('rfq_match_reasons_match_fk', [t.matchId, t.supplierCompanyId], () => [
      rfqSupplierMatches.id,
      rfqSupplierMatches.supplierCompanyId,
    ]),
    index('ix_rfq_match_reasons_match').on(t.matchId),
  ],
);

export const supplierMatchPreferences = pgTable(
  'supplier_match_preferences',
  {
    id: pk(),
    companyId: fk(() => companies.id, 'cascade'),
    categoryId: fkOpt(() => productCategories.id),
    destinationCountryId: fkOpt(() => countries.id),
    minOrderValueUsd: numeric({ precision: 20, scale: 2 }),
    notifyEnabled: boolean().notNull().default(true),
    isActive: boolean().notNull().default(true),
    ...stamps(),
  },
  (t) => [
    unique('ux_supplier_match_preferences').on(t.companyId, t.categoryId, t.destinationCountryId).nullsNotDistinct(),
    index('ix_supplier_match_preferences_company').on(t.companyId),
  ],
);

export const MATCH_FEEDBACK = ['relevant', 'not_relevant', 'spam', 'already_supplied'] as const;
export const supplierMatchFeedback = pgTable(
  'supplier_match_feedback',
  {
    id: pk(),
    matchId: uuid().notNull(),
    companyId: uuid().notNull(), // supplier
    feedback: enumText(MATCH_FEEDBACK).notNull(),
    comment: text(),
    createdAt: createdAt(),
  },
  (t) => [
    tenantFk('supplier_match_feedback_match_fk', [t.matchId, t.companyId], () => [
      rfqSupplierMatches.id,
      rfqSupplierMatches.supplierCompanyId,
    ]),
    unique('ux_supplier_match_feedback').on(t.matchId, t.companyId),
    check('supplier_match_feedback_chk', oneOf(t.feedback, MATCH_FEEDBACK)),
  ],
);
