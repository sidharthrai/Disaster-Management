import { resolve } from 'node:path';
import { SqliteRepository } from '../src/server/repository';
import { seedState } from '../src/domain/seed';
const db = new SqliteRepository(process.env.DATABASE_PATH || resolve(process.cwd(), 'data/community.sqlite'));
db.replace(seedState()); db.close();
process.stdout.write('Synthetic Riverton community reset. Demo clock: November 10, 2026, 12:00 PM America/Chicago.\n');
