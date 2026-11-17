import { z } from 'zod';

/** HTTP header names shared by the gateway and every service. */
export const HEADERS = {
  requestId: 'x-request-id',
  correlationId: 'x-correlation-id',
  authorization: 'authorization',
  /** Forwarded end-user access token (gateway → service), alongside the service token in `authorization`. */
  userToken: 'x-user-token',
} as const;

/** Internal: Identity asks Company whether a user is an ACTIVE member of a company, before issuing a token. */
export const membershipLookupResponseSchema = z.object({
  userId: z.uuid(),
  companyId: z.uuid(),
  status: z.enum(['active', 'suspended', 'removed']),
  roleKey: z.string().max(40),
  permissions: z.array(z.string().max(80)),
});
export type MembershipLookupResponse = z.infer<typeof membershipLookupResponseSchema>;

// ---- Identity (gateway → identity-service, /v1/auth/*) ----
const email = z.email().max(254);
const password = z.string().min(12).max(128);
export const registerInput = z.object({ email, password, locale: z.string().min(2).max(10).default('en') });
export const loginInput = z.object({ email, password });
export const refreshInput = z.object({
  refreshToken: z.string().min(20).max(200),
  companyId: z.uuid().optional(),
});
export const logoutInput = z.object({ refreshToken: z.string().min(20).max(200) });
export const authPayloadSchema = z.object({ accessToken: z.string(), refreshToken: z.string() });
export type AuthPayload = z.infer<typeof authPayloadSchema>;

// ---- Company (gateway → company-service, /v1/companies) ----
export const createCompanyInput = z.object({
  id: z.uuid().optional(),
  legalName: z.string().trim().min(2).max(200),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
});
export const companySchema = z.object({
  id: z.uuid(),
  legalName: z.string(),
  countryCode: z.string(),
  roleKey: z.string(),
});
export type Company = z.infer<typeof companySchema>;
