/**
 * Declarative row-level-security + privilege specification. EVERY table in `public` must appear
 * here (the generator and a test both fail otherwise). The generator turns this into
 * migrations/0005_rls_policies_and_grants.sql.
 *
 * Vocabulary
 *   A / W   active company / writable company (verified membership, see app.active_company())
 *   U       current user id (transaction-local setting)
 *   can(p)  permission p held in the writable company (RBAC)
 *   adm(r)  platform administrator (optionally with role r; super_admin implies all)
 */
export const A = '(select app.active_company())';
export const W = '(select app.writable_company())';
export const U = '(select app.uid())';
export const can = (p: string) => `(select app.can_write('${p}'))`;
export const adm = (r?: string) => `(select app.is_platform_admin(${r ? `'${r}'` : ''}))`;
const own = (c = 'company_id') => `${c} = ${A}`;
const ownW = (perm: string, c = 'company_id') => `${c} = ${W} AND ${can(perm)}`;
const via = (col: string, table: string) => `${col} in (select id from public.${table})`;

export interface TablePolicy {
  select?: string;
  insert?: string;
  update?: string | { using: string; check: string };
  delete?: string;
  /** column-level UPDATE grant for the app role (default: all columns) */
  updateCols?: string[];
  /** worker role privileges: s = select, i = insert, u = update, d = delete */
  worker?: string;
  /** definer-helper (saudaro_authz) privileges, same letters */
  authz?: string;
  authzUpdateCols?: string[];
  /** projection-view owner (saudaro_pub): readable columns */
  pub?: string[];
  /** migrator may write this table despite FORCE RLS (seed data) */
  migrator?: boolean;
  /** reference data: ENABLE (not FORCE) RLS, SELECT for every role, writes by owner only */
  reference?: boolean;
}

/** owner-company CRUD with one permission; reads can be widened with `extra`. */
const T = (perm: string, o: { extra?: string; noDelete?: boolean; noInsert?: boolean } = {}): TablePolicy => ({
  select: own() + (o.extra ? ` OR (${o.extra})` : ''),
  ...(o.noInsert ? {} : { insert: ownW(perm) }),
  update: { using: ownW(perm), check: ownW(perm) },
  ...(o.noDelete ? {} : { delete: ownW(perm) }),
});
const pubCo = (c = 'company_id') => `(select app.is_public_company(${c}))`;
const pubSeller = (c = 'company_id') => `(select app.is_public_seller(${c}))`;
const adminOnly = (role: string, w = ''): TablePolicy => ({
  select: adm(role),
  insert: adm(role),
  update: { using: adm(role), check: adm(role) },
  worker: w,
});
const viaDeal = (col = 'deal_id') => via(col, 'deals');

export const REFERENCE_TABLES = [
  'currencies', 'countries', 'states_provinces', 'cities', 'ports', 'units_of_measure', 'languages', 'incoterms',
  'payment_terms', 'packaging_types', 'shipment_modes', 'business_types', 'product_categories',
  'product_category_closure', 'hs_codes', 'certification_issuers', 'certifications', 'permissions',
  'product_specification_definitions', 'verification_providers',
] as const;

const refEntries = REFERENCE_TABLES.map((t) => [t, { reference: true } satisfies TablePolicy] as const);

const productChildren = [
  'product_categories_mapping', 'product_images', 'product_documents', 'product_specifications',
  'product_certifications', 'product_hs_codes',
].map(
  (t) =>
    [
      t,
      {
        select: via('product_id', 'products'),
        insert: ownW('catalog.manage'),
        update: { using: ownW('catalog.manage'), check: ownW('catalog.manage') },
        delete: ownW('catalog.manage'),
        worker: 's',
      } satisfies TablePolicy,
    ] as const,
);

const sellerPublic = [
  'seller_capabilities', 'seller_export_markets', 'seller_supply_regions', 'seller_shipping_ports',
  'seller_product_capabilities', 'seller_incoterm_capabilities', 'seller_certifications',
].map((t) => [t, { ...T('seller_profile.manage', { extra: pubSeller() }), worker: 's' } satisfies TablePolicy] as const);

const sellerPrivate = [
  'seller_capacity_records', 'seller_moq_records', 'seller_lead_times', 'seller_packaging_capabilities',
  'seller_payment_methods', 'seller_accepted_currencies',
].map((t) => [t, { ...T('seller_profile.manage'), worker: 's' } satisfies TablePolicy] as const);

const quotationRevisionChildren = [
  'quotation_items', 'quotation_terms', 'quotation_certifications', 'quotation_attachments',
].map(
  (t) =>
    [
      t,
      {
        select: `${own()} OR ${via('revision_id', 'quotation_revisions')}`,
        insert: ownW('quotation.create'),
        update: { using: ownW('quotation.create'), check: ownW('quotation.create') },
        delete: ownW('quotation.create'),
      } satisfies TablePolicy,
    ] as const,
);

export const SPEC: Record<string, TablePolicy> = {
  // ---------------------------------------------------------------- reference
  ...Object.fromEntries(refEntries),

  // ---------------------------------------------------------------- identity
  users: {
    select: `id = ${U} OR (select app.shares_company_with(id)) OR ${adm('support')}`,
    insert: `id = ${U}`,
    update: { using: `id = ${U}`, check: `id = ${U}` },
    updateCols: ['display_name', 'locale', 'timezone', 'phone_e164'],
    worker: 'siu',
    authz: 's',
  },
  user_auth_identities: {
    select: `user_id = ${U}`,
    insert: `user_id = ${U}`,
    delete: `user_id = ${U}`,
    update: { using: `user_id = ${U}`, check: `user_id = ${U}` },
    updateCols: ['password_hash', 'password_updated_at', 'last_used_at'],
    worker: 's',
    authz: 's',
  },
  user_sessions: {
    select: `user_id = ${U}`,
    insert: `user_id = ${U}`,
    delete: `user_id = ${U}`,
    update: { using: `user_id = ${U}`, check: `user_id = ${U}` },
    updateCols: ['revoked_at', 'last_seen_at'],
    worker: 'su',
  },
  user_mfa_methods: {
    select: `user_id = ${U}`,
    insert: `user_id = ${U}`,
    delete: `user_id = ${U}`,
    update: { using: `user_id = ${U}`, check: `user_id = ${U}` },
    updateCols: ['label', 'verified_at', 'last_used_at', 'disabled_at'],
  },
  user_security_events: { select: `user_id = ${U}`, insert: `user_id = ${U}`, worker: 'si' },
  password_reset_tokens: { select: `user_id = ${U}`, insert: `user_id = ${U}`, worker: 'siud' },
  email_verification_tokens: { select: `user_id = ${U}`, insert: `user_id = ${U}`, worker: 'siud' },
  phone_verification_tokens: { select: `user_id = ${U}`, insert: `user_id = ${U}`, worker: 'siud' },
  user_preferences: {
    select: `user_id = ${U}`,
    insert: `user_id = ${U}`,
    update: { using: `user_id = ${U}`, check: `user_id = ${U}` },
  },
  user_notification_preferences: {
    select: `user_id = ${U}`,
    insert: `user_id = ${U}`,
    delete: `user_id = ${U}`,
    update: { using: `user_id = ${U}`, check: `user_id = ${U}` },
    updateCols: ['enabled'],
    worker: 's',
  },

  // ---------------------------------------------------------------- companies & RBAC
  companies: {
    select: `(select app.is_member(id)) OR ${adm()}`,
    update: {
      using: `(id = ${W} AND ${can('company.manage')}) OR ${adm('moderator')}`,
      check: `(id = ${W} AND ${can('company.manage')}) OR ${adm('moderator')}`,
    },
    updateCols: ['legal_name', 'display_name', 'slug', 'status', 'suspended_at', 'suspension_reason', 'closed_at'],
    worker: 's',
    authz: 'siu',
    authzUpdateCols: ['is_business_verified'],
    pub: ['id', 'display_name', 'slug', 'country_id', 'is_business_verified', 'status', 'created_at'],
  },
  company_profiles: {
    select: `${own()} OR (is_public AND ${pubCo()})`,
    update: { using: ownW('company.profile.manage'), check: ownW('company.profile.manage') },
    authz: 'si',
    pub: ['company_id', 'tagline', 'description', 'year_established', 'employee_count_range', 'website', 'is_public'],
  },
  company_addresses: T('company.profile.manage', { extra: `is_public AND ${pubCo()}` }),
  company_contacts: T('company.profile.manage', { extra: `is_public AND ${pubCo()}` }),
  company_settings: {
    select: own(),
    update: { using: ownW('settings.manage'), check: ownW('settings.manage') },
    authz: 'si',
  },
  company_business_types: T('company.profile.manage', { extra: pubCo() }),
  company_registration_identifiers: T('company.manage', { extra: adm('verification_officer') }),
  company_roles: {
    select: `company_id is null OR ${own()}`,
    insert: `${ownW('roles.manage')} AND not is_system`,
    update: { using: `${ownW('roles.manage')} AND not is_system`, check: `${ownW('roles.manage')} AND not is_system` },
    delete: `${ownW('roles.manage')} AND not is_system`,
    authz: 's',
    migrator: true,
  },
  company_role_permissions: {
    select: via('role_id', 'company_roles'),
    insert: `exists (select 1 from public.company_roles r where r.id = role_id and r.company_id = ${W} and not r.is_system) AND ${can('roles.manage')}`,
    delete: `exists (select 1 from public.company_roles r where r.id = role_id and r.company_id = ${W} and not r.is_system) AND ${can('roles.manage')}`,
    authz: 's',
    migrator: true,
  },
  company_memberships: {
    select: `user_id = ${U} OR ${own()}`,
    insert: ownW('members.manage'),
    update: {
      using: `${ownW('members.manage')} OR user_id = ${U}`,
      check: `${ownW('members.manage')} OR user_id = ${U}`,
    },
    updateCols: ['role_id', 'status'],
    authz: 'siu',
  },
  company_invitations: {
    ...T('invitations.manage', { noDelete: true }),
    updateCols: ['status'],
    authz: 'su',
  },

  // ---------------------------------------------------------------- documents / files
  files: {
    select: [
      own(),
      `(access_level = 'public' and status = 'available' and scan_status = 'clean')`,
      `exists (select 1 from public.file_access_grants g where g.file_id = files.id and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()))`,
      `exists (select 1 from public.deal_document_versions v where v.file_id = files.id)`,
      `exists (select 1 from public.message_attachments m where m.file_id = files.id)`,
      `exists (select 1 from public.quotation_attachments q where q.file_id = files.id)`,
      `exists (select 1 from public.rfq_attachments r where r.file_id = files.id)`,
      `exists (select 1 from public.verification_documents vd where vd.file_id = files.id)`,
    ].join(' OR '),
    insert: `${ownW('files.manage')} AND uploaded_by_user_id = ${U}`,
    update: { using: ownW('files.manage'), check: ownW('files.manage') },
    updateCols: ['status', 'deleted_at'],
    worker: 'su',
  },
  file_versions: { select: via('file_id', 'files'), insert: ownW('files.manage'), worker: 's' },
  file_access_grants: {
    select: `${own()} OR grantee_company_id = ${A} OR grantee_user_id = ${U}`,
    insert: `${ownW('files.manage')} AND granted_by_user_id = ${U}`,
    update: { using: ownW('files.manage'), check: ownW('files.manage') },
    updateCols: ['revoked_at'],
  },
  file_scan_results: { select: via('file_id', 'files'), worker: 'si' },
  company_documents: {
    select: `${own()} OR (visibility = 'public' AND ${pubCo()}) OR (visibility = 'verifiers' AND ${adm('verification_officer')})`,
    insert: ownW('company.profile.manage'),
    update: { using: ownW('company.profile.manage'), check: ownW('company.profile.manage') },
    delete: ownW('company.profile.manage'),
  },

  // ---------------------------------------------------------------- verification (admin-decided)
  company_verification_levels: {
    select: `${own()} OR ${adm('verification_officer')}`,
    insert: adm('verification_officer'),
    update: { using: adm('verification_officer'), check: adm('verification_officer') },
    worker: 'siu',
    authz: 's',
  },
  verification_cases: {
    select: `${own()} OR ${adm('verification_officer')}`,
    insert: `(${ownW('verification.submit')}) OR ${adm('verification_officer')}`,
    update: {
      using: `(${ownW('verification.submit')}) OR ${adm('verification_officer')}`,
      check: `(${ownW('verification.submit')}) OR ${adm('verification_officer')}`,
    },
  },
  verification_documents: {
    select: `${own()} OR ${adm('verification_officer')}`,
    insert: ownW('verification.submit'),
    update: { using: adm('verification_officer'), check: adm('verification_officer') },
  },
  verification_checks: adminOnly('verification_officer', 'siu'),
  verification_status_history: {
    select: `${own()} OR ${adm('verification_officer')}`,
    insert: `${own()} OR ${adm('verification_officer')}`,
    worker: 'si',
  },
  compliance_flags: adminOnly('compliance_officer'),
  sanctions_screening_records: adminOnly('compliance_officer', 'si'),
  verification_expiry_records: {
    select: `${own()} OR ${adm('verification_officer')}`,
    insert: adm('verification_officer'),
    update: { using: adm('verification_officer'), check: adm('verification_officer') },
    worker: 'siu',
  },

  // ---------------------------------------------------------------- catalog
  products: {
    select: `${own()} OR (status = 'active' AND ${pubCo()})`,
    insert: ownW('catalog.manage'),
    update: { using: ownW('catalog.manage'), check: ownW('catalog.manage') },
    delete: ownW('catalog.manage'),
    worker: 's',
  },
  ...Object.fromEntries(productChildren),
  seller_product_listings: {
    select: `${own()} OR (status = 'active' AND ${pubCo()})`,
    insert: ownW('catalog.manage'),
    update: { using: ownW('catalog.manage'), check: ownW('catalog.manage') },
    delete: ownW('catalog.manage'),
    worker: 's',
  },

  // ---------------------------------------------------------------- seller profile (public-when-published vs private)
  seller_trade_profiles: {
    select: `${own()} OR (is_published AND ${pubCo()})`,
    insert: ownW('seller_profile.manage'),
    update: { using: ownW('seller_profile.manage'), check: ownW('seller_profile.manage') },
    worker: 's',
    authz: 's',
  },
  ...Object.fromEntries(sellerPublic),
  ...Object.fromEntries(sellerPrivate),
  seller_trade_terms: { ...T('seller_profile.manage', { noDelete: true }), worker: 's' },

  // ---------------------------------------------------------------- buyer profile (private to the buyer company)
  buyer_profiles: { ...T('buyer_profile.manage', { noDelete: true }), worker: 's' },
  buyer_product_interests: { ...T('buyer_profile.manage'), worker: 's' },
  buyer_import_markets: { ...T('buyer_profile.manage'), worker: 's' },
  buyer_preferred_origins: { ...T('buyer_profile.manage'), worker: 's' },
  buyer_trade_preferences: { ...T('buyer_profile.manage', { noDelete: true }), worker: 's' },
  buyer_import_requirements: { ...T('buyer_profile.manage'), worker: 's' },

  // ---------------------------------------------------------------- RFQs (owner reads base tables; suppliers use projection views)
  rfqs: {
    select: own(),
    insert: `${ownW('rfq.create')} AND created_by_user_id = ${U}`,
    update: { using: ownW('rfq.create'), check: ownW('rfq.create') },
    delete: `${ownW('rfq.manage')} AND status = 'draft'`,
    worker: 'su',
    authz: 's',
    pub: [
      'id', 'reference_no', 'company_id', 'title', 'description', 'primary_category_id', 'status', 'visibility',
      'currency_id', 'allow_partial_quotes', 'quote_deadline_at', 'published_at', 'expires_at',
    ],
  },
  rfq_items: {
    ...T('rfq.create'),
    worker: 's',
    authz: 's',
    pub: ['id', 'rfq_id', 'line_no', 'product_name', 'description', 'category_id', 'hs_code_id', 'quantity', 'uom_id', 'required_delivery_date'],
  },
  rfq_specifications: {
    ...T('rfq.create'),
    worker: 's',
    pub: ['id', 'rfq_item_id', 'definition_id', 'custom_name', 'value_text', 'value_number', 'value_boolean', 'value_min', 'value_max', 'uom_id', 'is_mandatory'],
  },
  rfq_destinations: {
    ...T('rfq.create'),
    worker: 's',
    pub: ['id', 'rfq_id', 'country_id', 'port_id', 'place_name', 'incoterm_id', 'incoterm_named_place', 'required_by_date'],
  },
  rfq_trade_requirements: { ...T('rfq.create'), worker: 's' },
  rfq_payment_preferences: { ...T('rfq.create'), worker: 's' },
  rfq_origin_preferences: { ...T('rfq.create'), worker: 's' },
  rfq_required_documents: { ...T('rfq.create'), worker: 's' },
  rfq_certification_requirements: { ...T('rfq.create'), worker: 's' },
  rfq_visibility_rules: { ...T('rfq.create'), worker: 's', authz: 's' },
  rfq_attachments: T('rfq.create', { extra: 'rfq_id in (select id from app.public_rfqs)' }),
  rfq_status_history: { select: own(), insert: own(), worker: 's' },
  rfq_invitations: {
    select: `${own()} OR invited_company_id = ${A}`,
    insert: ownW('rfq.manage'),
    update: {
      using: `${ownW('rfq.manage')} OR invited_company_id = ${W}`,
      check: `${ownW('rfq.manage')} OR invited_company_id = ${W}`,
    },
    updateCols: ['status', 'responded_at'],
    delete: ownW('rfq.manage'),
    worker: 's',
    authz: 's',
  },
  rfq_views: {
    select: `${own()} OR ${via('rfq_id', 'rfqs')}`,
    insert: `company_id = ${W} AND viewer_user_id = ${U} AND rfq_id in (select id from app.public_rfqs)`,
  },
  rfq_saved_records: {
    select: `${own()} AND user_id = ${U}`,
    insert: `company_id = ${W} AND user_id = ${U} AND rfq_id in (select id from app.public_rfqs)`,
    delete: `company_id = ${W} AND user_id = ${U}`,
  },
  rfq_clarifications: {
    select: `asked_by_company_id = ${A} OR rfq_company_id = ${A} OR (is_public AND rfq_id in (select id from app.public_rfqs))`,
    insert: `asked_by_company_id = ${W} AND asked_by_user_id = ${U} AND rfq_id in (select id from app.public_rfqs)`,
    update: { using: ownW('rfq.manage', 'rfq_company_id'), check: ownW('rfq.manage', 'rfq_company_id') },
    updateCols: ['answer', 'answered_by_user_id', 'answered_at', 'is_public'],
  },

  // ---------------------------------------------------------------- matching (worker-written, advisory)
  rfq_match_runs: { select: own(), worker: 'siu' },
  rfq_supplier_matches: {
    select: `buyer_company_id = ${A} OR supplier_company_id = ${A}`,
    update: { using: `supplier_company_id = ${W}`, check: `supplier_company_id = ${W}` },
    updateCols: ['status'],
    worker: 'siu',
  },
  rfq_match_reasons: { select: `supplier_company_id = ${A}`, worker: 'si' },
  supplier_match_preferences: { ...T('seller_profile.manage'), worker: 's' },
  supplier_match_feedback: { ...T('seller_profile.manage', { noDelete: true }), worker: 's' },

  // ---------------------------------------------------------------- quotations
  quotations: {
    select: `${own()} OR (buyer_company_id = ${A} AND status <> 'draft')`,
    insert: `${ownW('quotation.create')} AND created_by_user_id = ${U}`,
    update: {
      using: `(${ownW('quotation.submit')}) OR (buyer_company_id = ${W} AND status <> 'draft' AND ${can('quotation.accept')})`,
      check: `company_id = ${W} OR buyer_company_id = ${W}`,
    },
    worker: 'su',
    authz: 's',
    pub: ['id', 'rfq_id', 'company_id'],
  },
  quotation_revisions: {
    select: `${own()} OR (status = 'submitted' AND ${via('quotation_id', 'quotations')})`,
    insert: ownW('quotation.create'),
    update: { using: ownW('quotation.create'), check: ownW('quotation.create') },
    delete: ownW('quotation.create'),
    authz: 's',
  },
  ...Object.fromEntries(quotationRevisionChildren),
  quotation_specifications: {
    select: `${own()} OR ${via('quotation_item_id', 'quotation_items')}`,
    insert: ownW('quotation.create'),
    update: { using: ownW('quotation.create'), check: ownW('quotation.create') },
    delete: ownW('quotation.create'),
  },
  quotation_status_history: {
    select: via('quotation_id', 'quotations'),
    insert: `actor_company_id = ${A} AND ${via('quotation_id', 'quotations')}`,
    worker: 'si',
  },
  quotation_comparisons: T('rfq.manage'),
  quotation_comparison_entries: T('rfq.manage'),
  negotiation_events: {
    select: via('quotation_id', 'quotations'),
    insert: `actor_company_id = ${W} AND actor_user_id = ${U} AND ${via('quotation_id', 'quotations')}`,
  },

  // ---------------------------------------------------------------- deals
  deals: {
    select: `buyer_company_id = ${A} OR supplier_company_id = ${A} OR (select app.is_deal_party(id))`,
    insert: ownW('quotation.accept', 'buyer_company_id'),
    update: {
      using: `(select app.is_deal_party(id)) AND ${can('deal.manage')}`,
      check: `(select app.is_deal_party(id)) AND ${can('deal.manage')}`,
    },
    worker: 's',
  },
  deal_parties: {
    select: `company_id = ${A} OR (select app.is_deal_party(deal_id))`,
    insert: `${can('deal.manage')} AND exists (select 1 from public.deals d where d.id = deal_id and d.buyer_company_id = ${W})`,
    worker: 's',
    authz: 's',
  },
  deal_terms: {
    select: viaDeal(),
    insert: `${can('quotation.accept')} AND exists (select 1 from public.deals d where d.id = deal_id and d.buyer_company_id = ${W})`,
  },
  deal_items: {
    select: viaDeal(),
    insert: `${can('quotation.accept')} AND exists (select 1 from public.deals d where d.id = deal_id and d.buyer_company_id = ${W})`,
  },
  deal_documents: {
    select: viaDeal(),
    insert: `created_by_company_id = ${W} AND created_by_user_id = ${U} AND ${viaDeal()} AND ${can('deal.manage')}`,
    update: { using: `${viaDeal()} AND ${can('deal.manage')}`, check: `${viaDeal()} AND ${can('deal.manage')}` },
    updateCols: ['title', 'status'],
  },
  deal_document_versions: {
    select: viaDeal(),
    insert: `uploaded_by_company_id = ${W} AND uploaded_by_user_id = ${U} AND ${viaDeal()} AND ${can('deal.manage')}`,
  },
  deal_milestones: {
    select: viaDeal(),
    insert: `${viaDeal()} AND ${can('deal.manage')}`,
    update: { using: `${viaDeal()} AND ${can('deal.manage')}`, check: `${viaDeal()} AND ${can('deal.manage')}` },
    updateCols: ['title', 'due_date', 'status', 'completed_at'],
  },
  deal_milestone_events: {
    select: viaDeal(),
    insert: `actor_company_id = ${W} AND actor_user_id = ${U} AND ${viaDeal()}`,
  },
  deal_status_history: { select: viaDeal(), insert: viaDeal(), worker: 's' },
  deal_activity_events: { select: viaDeal(), insert: `actor_company_id = ${A} AND ${viaDeal()}`, worker: 'si' },
  deal_confirmations: {
    select: viaDeal(),
    insert: `company_id = ${W} AND confirmed_by_user_id = ${U} AND ${can('deal.confirm')} AND ${viaDeal()}`,
  },
  deal_cancellations: {
    select: viaDeal(),
    insert: `requested_by_company_id = ${W} AND requested_by_user_id = ${U} AND ${can('deal.manage')} AND ${viaDeal()}`,
    update: {
      using: `${viaDeal()} AND ${can('deal.manage')}`,
      check: `(status = 'withdrawn' AND requested_by_company_id = ${W}) OR (status in ('accepted','rejected') AND requested_by_company_id <> ${W} AND responded_by_company_id = ${W})`,
    },
    updateCols: ['status', 'responded_by_company_id', 'responded_at'],
  },
  deal_disputes: {
    select: `${viaDeal()} OR ${adm('support')}`,
    insert: `raised_by_company_id = ${W} AND raised_by_user_id = ${U} AND ${can('deal.manage')} AND ${viaDeal()}`,
    update: { using: adm('support'), check: adm('support') },
  },
  deal_shipments: {
    select: viaDeal(),
    insert: `added_by_company_id = ${W} AND ${viaDeal()} AND ${can('deal.manage')}`,
    update: { using: `${viaDeal()} AND ${can('deal.manage')}`, check: `${viaDeal()} AND ${can('deal.manage')}` },
  },

  // ---------------------------------------------------------------- conversations (participant-based)
  conversations: {
    select: `created_by_user_id = ${U} OR (select app.is_conversation_participant(id))`,
    insert: `initiator_company_id = ${W} AND created_by_user_id = ${U} AND ${can('messages.send')}`,
    update: {
      using: '(select app.is_conversation_participant(id))',
      check: '(select app.is_conversation_participant(id))',
    },
    updateCols: ['last_message_at', 'status', 'subject'],
    worker: 's',
  },
  conversation_participants: {
    select: `user_id = ${U} OR (select app.is_conversation_participant(conversation_id))`,
    insert: `exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by_user_id = ${U} and company_id in (c.initiator_company_id, c.counterparty_company_id)) OR ((select app.is_conversation_participant(conversation_id)) AND company_id = ${W} AND ${can('messages.manage')})`,
    update: { using: `user_id = ${U}`, check: `user_id = ${U}` },
    updateCols: ['left_at'],
    worker: 's',
    authz: 's',
  },
  messages: {
    select: `(select app.is_conversation_participant(conversation_id)) OR (${adm('moderator')} AND exists (select 1 from public.message_reports r where r.message_id = messages.id))`,
    insert: `sender_user_id = ${U} AND sender_company_id = ${W} AND ${can('messages.send')}`,
    update: { using: `sender_user_id = ${U}`, check: `sender_user_id = ${U}` },
    updateCols: ['body', 'deleted_at'],
    worker: 'si',
  },
  message_attachments: {
    select: via('message_id', 'messages'),
    insert: `message_id in (select id from public.messages where sender_user_id = ${U})`,
  },
  message_read_receipts: {
    select: via('message_id', 'messages'),
    insert: `user_id = ${U} AND ${via('message_id', 'messages')}`,
  },
  message_delivery_events: { select: `recipient_user_id = ${U}`, worker: 'si' },
  conversation_archives: {
    select: `user_id = ${U}`,
    delete: `user_id = ${U}`,
    insert: `user_id = ${U} AND ${via('conversation_id', 'conversations')}`,
  },
  message_reports: {
    select: `reporter_user_id = ${U} OR ${adm('moderator')}`,
    insert: `reporter_user_id = ${U} AND reporter_company_id = ${W} AND ${via('message_id', 'messages')}`,
    update: { using: adm('moderator'), check: adm('moderator') },
  },

  // ---------------------------------------------------------------- reviews
  company_reviews: {
    select: `status = 'published' OR reviewer_company_id = ${A} OR reviewed_company_id = ${A} OR ${adm('moderator')}`,
    insert: `reviewer_company_id = ${W} AND reviewer_user_id = ${U} AND ${can('review.write')}`,
    update: {
      using: `(reviewer_company_id = ${W} AND ${can('review.write')}) OR ${adm('moderator')}`,
      check: `(reviewer_company_id = ${W} AND ${can('review.write')}) OR ${adm('moderator')}`,
    },
    worker: 's',
  },
  review_responses: {
    select: via('review_id', 'company_reviews'),
    insert: `responding_company_id = ${W} AND responded_by_user_id = ${U} AND ${can('review.respond')}`,
    update: {
      using: `responding_company_id = ${W} AND ${can('review.respond')}`,
      check: `responding_company_id = ${W}`,
    },
    updateCols: ['body'],
  },
  review_reports: {
    select: `reporter_user_id = ${U} OR ${adm('moderator')}`,
    insert: `reporter_user_id = ${U} AND reporter_company_id = ${W} AND ${via('review_id', 'company_reviews')}`,
    update: { using: adm('moderator'), check: adm('moderator') },
  },
  company_reputation_metrics: { select: `${own()} OR ${pubCo()}`, worker: 'siu' },

  // ---------------------------------------------------------------- notifications
  notification_templates: {
    select: adm(),
    insert: adm('super_admin'),
    update: { using: adm('super_admin'), check: adm('super_admin') },
    worker: 's',
    migrator: true,
  },
  notifications: {
    select: `recipient_user_id = ${U}`,
    delete: `recipient_user_id = ${U}`,
    update: { using: `recipient_user_id = ${U}`, check: `recipient_user_id = ${U}` },
    updateCols: ['read_at'],
    worker: 'si',
  },
  notification_deliveries: { select: via('notification_id', 'notifications'), worker: 'siu' },
  device_tokens: {
    select: `user_id = ${U}`,
    insert: `user_id = ${U}`,
    delete: `user_id = ${U}`,
    update: { using: `user_id = ${U}`, check: `user_id = ${U}` },
    updateCols: ['last_seen_at', 'revoked_at'],
    worker: 'su',
  },

  // ---------------------------------------------------------------- administration & audit
  admin_role_assignments: {
    select: `user_id = ${U} OR ${adm()}`,
    insert: adm('super_admin'),
    update: { using: adm('super_admin'), check: adm('super_admin') },
    updateCols: ['revoked_at'],
    authz: 's',
  },
  admin_actions: { select: `admin_user_id = ${U} OR ${adm('super_admin')}`, insert: `admin_user_id = ${U} AND ${adm()}` },
  audit_logs: {
    select: `(company_id = ${A} AND (select app.can_read('audit.read'))) OR ${adm('compliance_officer')} OR ${adm('readonly_auditor')}`,
    insert: `actor_user_id = ${U} AND (company_id is null OR company_id = ${A} OR ${adm()})`,
    worker: 'si',
  },
  security_events: { select: adm('compliance_officer'), insert: `user_id = ${U}`, worker: 'si' },
  moderation_cases: adminOnly('moderator'),
  moderation_actions: { select: adm('moderator'), insert: `admin_user_id = ${U} AND ${adm('moderator')}` },
  abuse_reports: {
    select: `reporter_user_id = ${U} OR ${adm('moderator')}`,
    insert: `reporter_user_id = ${U} AND (reporter_company_id is null OR reporter_company_id = ${W})`,
    update: { using: adm('moderator'), check: adm('moderator') },
  },
  system_settings: {
    select: `is_public OR ${adm()}`,
    insert: adm('super_admin'),
    update: { using: adm('super_admin'), check: adm('super_admin') },
    worker: 's',
    migrator: true,
  },
  outbox_events: { insert: `company_id is null OR company_id = ${W}`, worker: 'su' },
  idempotency_keys: { select: `user_id = ${U}`, insert: `user_id = ${U}`, delete: `user_id = ${U}`, worker: 'sd' },
};
