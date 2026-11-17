import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { commonTablesSql } from '@saudaro/database-utils';
import { DB_SERVICES, migrationsFolder } from './services.ts';

/** (Re)writes 0000_common_tables.sql of every service from the single source of truth. Run BEFORE first deploy. */
for (const s of DB_SERVICES) {
  writeFileSync(join(migrationsFolder(s), '0000_common_tables.sql'), commonTablesSql(s.schema));
  console.log(`wrote ${s.dir}/migrations/0000_common_tables.sql`);
}
