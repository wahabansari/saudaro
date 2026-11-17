import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, enumText, fk, fkOpt, oneOf, pk, stamps, tstz } from './_helpers.ts';
import { companies } from './companies.ts';
import { deals } from './deals.ts';
import { users } from './identity.ts';

/**
 * Reviews & reputation. A review requires a platform-recorded COMPLETED deal between the two
 * companies (deal_id NOT NULL, trigger-validated), so every review is a verified-transaction
 * review. One review per (deal, reviewing company). Status 'completed' of a deal says nothing
 * about payment; reviews therefore describe the trade relationship, not payment performance.
 */

export const REVIEW_STATUS = ['pending', 'published', 'rejected', 'removed'] as const;
export const companyReviews = pgTable(
  'company_reviews',
  {
    id: pk(),
    dealId: fk(() => deals.id),
    reviewerCompanyId: fk(() => companies.id),
    reviewedCompanyId: fk(() => companies.id),
    reviewerUserId: fk(() => users.id),
    rating: smallint().notNull(),
    title: text(),
    body: text(),
    status: enumText(REVIEW_STATUS).notNull().default('pending'),
    moderatedByUserId: fkOpt(() => users.id),
    moderatedAt: tstz(),
    moderationNote: text(),
    publishedAt: tstz(),
    ...stamps(),
  },
  (t) => [
    unique('ux_company_reviews_id_reviewed').on(t.id, t.reviewedCompanyId),
    // Prevent duplicate reviews for the same transaction and reviewing party.
    unique('ux_company_reviews_deal_reviewer').on(t.dealId, t.reviewerCompanyId),
    check('company_reviews_rating_chk', sql`${t.rating} between 1 and 5`),
    check('company_reviews_status_chk', oneOf(t.status, REVIEW_STATUS)),
    check('company_reviews_not_self_chk', sql`${t.reviewerCompanyId} <> ${t.reviewedCompanyId}`),
    check('company_reviews_body_chk', sql`${t.body} is null or length(${t.body}) <= 5000`),
    check('company_reviews_published_chk', sql`(${t.status} = 'published') = (${t.publishedAt} is not null)`),
    index('ix_company_reviews_reviewed')
      .on(t.reviewedCompanyId, t.publishedAt.desc().nullsFirst())
      .where(sql`${t.status} = 'published'`),
    index('ix_company_reviews_reviewer').on(t.reviewerCompanyId, t.createdAt.desc().nullsFirst()),
    index('ix_company_reviews_queue')
      .on(t.createdAt)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export const reviewResponses = pgTable(
  'review_responses',
  {
    id: pk(),
    reviewId: uuid().notNull(),
    respondingCompanyId: uuid().notNull(),
    respondedByUserId: fk(() => users.id),
    body: text().notNull(),
    status: enumText(['published', 'removed'] as const)
      .notNull()
      .default('published'),
    ...stamps(),
  },
  (t) => [
    // Only the reviewed company can respond, and only once.
    foreignKey({
      name: 'review_responses_review_fk',
      columns: [t.reviewId, t.respondingCompanyId],
      foreignColumns: [companyReviews.id, companyReviews.reviewedCompanyId],
    }).onDelete('cascade'),
    unique('ux_review_responses_review').on(t.reviewId),
    check('review_responses_body_chk', sql`length(${t.body}) between 1 and 3000`),
  ],
);

export const reviewReports = pgTable(
  'review_reports',
  {
    id: pk(),
    reviewId: fk(() => companyReviews.id, 'cascade'),
    reporterUserId: fk(() => users.id),
    reporterCompanyId: fk(() => companies.id),
    reason: enumText(['fake', 'abusive', 'conflict_of_interest', 'privacy', 'other'] as const).notNull(),
    details: text(),
    status: enumText(['open', 'reviewing', 'actioned', 'dismissed'] as const)
      .notNull()
      .default('open'),
    createdAt: createdAt(),
    resolvedAt: tstz(),
  },
  (t) => [
    unique('ux_review_reports').on(t.reviewId, t.reporterUserId),
    check(
      'review_reports_reason_chk',
      oneOf(t.reason, ['fake', 'abusive', 'conflict_of_interest', 'privacy', 'other']),
    ),
    check('review_reports_status_chk', oneOf(t.status, ['open', 'reviewing', 'actioned', 'dismissed'])),
  ],
);

/** Derived by the worker from published reviews + deals; never client-writable. */
export const companyReputationMetrics = pgTable(
  'company_reputation_metrics',
  {
    companyId: uuid()
      .primaryKey()
      .references(() => companies.id, { onDelete: 'cascade' }),
    reviewCount: integer().notNull().default(0),
    averageRating: numeric({ precision: 3, scale: 2 }),
    completedDeals: integer().notNull().default(0),
    avgResponseHours: numeric({ precision: 8, scale: 2 }),
    computedAt: tstz().notNull().defaultNow(),
  },
  (t) => [
    check(
      'company_reputation_metrics_rating_chk',
      sql`${t.averageRating} is null or ${t.averageRating} between 1 and 5`,
    ),
    check('company_reputation_metrics_counts_chk', sql`${t.reviewCount} >= 0 and ${t.completedDeals} >= 0`),
  ],
);
