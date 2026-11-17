import { generateSigningKey } from '@saudaro/authentication';

/**
 * Prints the signing-key env lines for LOCAL development. Paste into .env (git-ignored).
 * The gateway key is marked use:"svc" so it can sign service tokens but can never mint user tokens.
 */
const identity = await generateSigningKey('identity-1');
const gateway = await generateSigningKey('gateway-1', 'svc');
console.log(`AUTH_SIGNING_JWK=${JSON.stringify(identity.privateJwk)}`);
console.log(`GATEWAY_SIGNING_JWK=${JSON.stringify(gateway.privateJwk)}`);
console.log(`AUTH_PUBLIC_JWKS=${JSON.stringify({ keys: [identity.publicJwk, gateway.publicJwk] })}`);
