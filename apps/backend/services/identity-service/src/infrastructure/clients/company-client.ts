import { membershipLookupResponseSchema, type MembershipLookupResponse } from '@saudaro/api-contracts';
import type { TokenService } from '@saudaro/authentication';
import { DependencyError } from '@saudaro/error-handling';

const TIMEOUT_MS = 5_000;

/** Asks Company Service whether a user belongs to a company; `null` = no such membership. */
export function createCompanyClient(baseUrl: string, tokens: TokenService, callerName: string) {
  return {
    async membership(
      companyId: string,
      userId: string,
      forwardHeaders: Record<string, string> = {},
    ): Promise<MembershipLookupResponse | null> {
      const token = await tokens.signServiceToken(callerName, 'company-service');
      const url = new URL(`/internal/memberships/${companyId}/${userId}`, baseUrl);
      const res = await fetch(url, { headers: { ...forwardHeaders, authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error' }).catch(
        (cause: unknown) => {
          throw new DependencyError(undefined, { cause });
        },
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new DependencyError(undefined, { cause: new Error(`company-service answered ${res.status}`) });
      const body = membershipLookupResponseSchema.safeParse(await res.json().catch(() => undefined));
      if (!body.success) throw new DependencyError(undefined, { cause: new Error('company-service sent an invalid membership response') });
      return body.data;
    },
  };
}

export type CompanyClient = ReturnType<typeof createCompanyClient>;
