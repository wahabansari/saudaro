import type { FastifyInstance } from 'fastify';
import { assertSafeRuntimeRole } from '../../database/client.ts';

/**
 * /health/live  – process is up (no dependencies; used by the orchestrator's liveness probe).
 * /health/ready – database reachable AND the runtime role is least-privilege (not superuser /
 *                 BYPASSRLS / table owner). Failing readiness takes the instance out of rotation.
 * Responses never include connection details or role names.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health/live', async () => ({ status: 'ok' }));

  app.get('/health/ready', async (_req, reply) => {
    try {
      await app.pool.query('select 1');
      await assertSafeRuntimeRole(app.pool);
      return { status: 'ready' };
    } catch (err) {
      app.log.error({ err: { message: (err as Error).message } }, 'readiness check failed');
      return reply.code(503).send({ status: 'unavailable' });
    }
  });
}
