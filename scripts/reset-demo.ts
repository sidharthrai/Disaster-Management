import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { seedState } from '../src/domain/seed';

if ((process.env.APP_MODE || 'demo') !== 'demo') throw new Error('Demo reset requires APP_MODE=demo.');
const path = resolve(process.env.DATABASE_PATH || 'data/community.sqlite');
const existed = existsSync(path);
mkdirSync(dirname(path), { recursive: true });
const db = new Database(path);
try {
  db.pragma('busy_timeout = 5000');
  db.transaction(() => {
    const hasTables = Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1").get());
    if (existed || hasTables) {
      // Refuse unknown or mixed datasets as well as explicitly live datasets.
      const settings = db.prepare("SELECT payload FROM settings WHERE id = 'community'").get() as { payload: string } | undefined;
      const users = db.prepare('SELECT payload FROM users').all() as { payload: string }[];
      if (!settings || JSON.parse(settings.payload).clockMode !== 'demo' || users.some(row => JSON.parse(row.payload).synthetic !== true)) {
        throw new Error('Refusing to reset a non-demo or unrecognized dataset.');
      }
    }
    const state = seedState();
    const tables = ['users', 'requests', 'offers', 'resources', 'commitments', 'events', 'messages', 'reports', 'coordinatorNotes', 'followUpEpisodes', 'notifications'] as const;
    for (const table of tables) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)))`);
      db.prepare(`DELETE FROM ${table}`).run();
      const insert = db.prepare(`INSERT INTO ${table}(id,payload) VALUES (?,?)`);
      for (const item of state[table]) insert.run(item.id, JSON.stringify(item));
    }
    db.exec('CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)))');
    db.prepare("INSERT INTO settings(id,payload) VALUES ('community',?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(JSON.stringify(state.settings));
  }).immediate();
} finally { db.close(); }
process.stdout.write('Synthetic Riverton community reset. Demo clock: November 10, 2026, 12:00 PM America/Chicago.\n');
