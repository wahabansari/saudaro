import { z } from 'zod';

/**
 * Claims of the short-lived ACCESS token (ADR-008). The active company (`cid`) is chosen at token issue
 * after Identity confirmed an active membership with Company Service; it is never taken from client input.
 */
export const accessClaimsSchema = z.object({
  /** user id */
  sub: z.uuid(),
  /** active company id (absent before a company is selected) */
  cid: z.uuid().optional(),
  /** session id: lets the gateway deny-list a revoked session until the token expires */
  sid: z.uuid(),
  /** session version: bumped on logout-everywhere / suspension */
  ver: z.number().int().min(0),
  /** company-scoped permissions, e.g. "rfq.create" */
  perms: z.array(z.string().max(80)).max(200).default([]),
  /** authentication methods used (pwd, otp, webauthn): drives step-up decisions */
  amr: z.array(z.string().max(20)).max(5).default([]),
});
export type AccessClaims = z.infer<typeof accessClaimsSchema>;
export type AccessClaimsInput = z.input<typeof accessClaimsSchema>;

export const serviceClaimsSchema = z.object({
  /** calling service name */
  svc: z.string().min(1).max(64),
});
export type ServiceClaims = z.infer<typeof serviceClaimsSchema>;
