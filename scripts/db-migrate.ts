import { runServiceMigrations } from '@saudaro/database-utils';
import { DB_SERVICES, migrationsFolder, roleUrl } from './services.ts';

/** Applies every service's migrations with ITS OWN migrator role (a service can only migrate its schema). */
for (const s of DB_SERVICES) {
  await runServiceMigrations({
    connectionString: roleUrl(s, 'migrator'),
    schema: s.schema,
    migrationsFolder: migrationsFolder(s),
  });
  console.log(`migrated ${s.schema}`);
}
