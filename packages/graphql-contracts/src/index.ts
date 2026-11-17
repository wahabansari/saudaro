import { createHash } from 'node:crypto';

/**
 * The gateway's GraphQL contract (schema-first SDL, version-controlled). It currently contains the health
 * and viewer queries, the authentication and company operations, and their input and output types.
 * Types for other domains (Rfq, Quotation …) are added with their services.
 */
export const typeDefs = /* GraphQL */ `
  """
  Liveness of the gateway itself. Contains no tenant data.
  """
  type HealthStatus {
    status: String!
    service: String!
    version: String!
    time: String!
  }

  """
  The authenticated caller, derived ONLY from the verified access token.
  """
  type Viewer {
    userId: ID!
    companyId: ID
    permissions: [String!]!
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
  }

  type Company {
    id: ID!
    legalName: String!
    countryCode: String!
    roleKey: String!
  }

  input RegisterInput {
    email: String!
    password: String!
    locale: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateCompanyInput {
    id: ID
    legalName: String!
    countryCode: String!
  }

  type Query {
    health: HealthStatus!
    """
    The current user and active company. Requires authentication.
    """
    viewer: Viewer
    """
    Companies the caller is an active member of. Requires authentication.
    """
    myCompanies: [Company!]!
  }

  type Mutation {
    register(input: RegisterInput!): Boolean!
    login(input: LoginInput!): AuthPayload!
    """
    Rotates the refresh token; with companyId the new access token carries that company (active members only).
    """
    refresh(refreshToken: String!, companyId: ID): AuthPayload!
    logout(refreshToken: String!): Boolean!
    createCompany(input: CreateCompanyInput!): Company!
  }
`;

/**
 * Client operations that production allows (persisted-query allowlist). Frontend clients import these
 * documents, so what the browser can run is exactly what is listed here.
 */
export const OPERATIONS = {
  Health: /* GraphQL */ `
    query Health {
      health {
        status
        service
        version
      }
    }
  `,
  Viewer: /* GraphQL */ `
    query Viewer {
      viewer {
        userId
        companyId
        permissions
      }
    }
  `,
  MyCompanies: /* GraphQL */ `
    query MyCompanies {
      myCompanies {
        id
        legalName
        countryCode
        roleKey
      }
    }
  `,
  Register: /* GraphQL */ `
    mutation Register($input: RegisterInput!) {
      register(input: $input)
    }
  `,
  Login: /* GraphQL */ `
    mutation Login($input: LoginInput!) {
      login(input: $input) {
        accessToken
        refreshToken
      }
    }
  `,
  Refresh: /* GraphQL */ `
    mutation Refresh($refreshToken: String!, $companyId: ID) {
      refresh(refreshToken: $refreshToken, companyId: $companyId) {
        accessToken
        refreshToken
      }
    }
  `,
  Logout: /* GraphQL */ `
    mutation Logout($refreshToken: String!) {
      logout(refreshToken: $refreshToken)
    }
  `,
  CreateCompany: /* GraphQL */ `
    mutation CreateCompany($input: CreateCompanyInput!) {
      createCompany(input: $input) {
        id
        legalName
        countryCode
        roleKey
      }
    }
  `,
} as const;
export type OperationName = keyof typeof OPERATIONS;

export const sha256Hash = (query: string): string => createHash('sha256').update(query, 'utf8').digest('hex');

/** sha256(query) → query, used by the gateway to resolve persisted queries. */
export function buildAllowlist(operations: Record<string, string> = OPERATIONS): Map<string, string> {
  return new Map(Object.values(operations).map((q) => [sha256Hash(q), q]));
}
