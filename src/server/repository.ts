import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { StateSchema, type State } from '../domain/model';
import type { Repository } from '../domain/store';
import { FollowUpService } from '../domain/followup';

const tables = ['users', 'requests', 'offers', 'resources', 'commitments', 'events', 'messages', 'reports', 'coordinatorNotes', 'followUpEpisodes', 'notifications'] as const;
const PayloadSchema = z.object({ payload: z.string() });
export class SqliteRepository implements Repository {
  private readonly db: Database.Database;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    for (const table of tables) this.db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)))`);
    this.db.exec("UPDATE messages SET payload = json_set(payload, '$.commitmentId', NULL) WHERE json_type(payload, '$.commitmentId') IS NULL");
    this.db.exec("UPDATE resources SET payload = json_set(payload, '$.capacityMode', 'concurrent') WHERE json_type(payload, '$.capacityMode') IS NULL");
    this.db.exec('CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, payload TEXT NOT NULL CHECK(json_valid(payload)))');
  }
  hasData() { return this.db.prepare('SELECT id FROM settings LIMIT 1').get() !== undefined; }
  read(): State {
    const result: Record<string, unknown> = {};
    for (const table of tables) result[table] = this.db.prepare(`SELECT payload FROM ${table} ORDER BY rowid`).all().map(row => JSON.parse(PayloadSchema.parse(row).payload));
    const settings = this.db.prepare("SELECT payload FROM settings WHERE id = 'community'").get();
    result.settings = settings ? JSON.parse(PayloadSchema.parse(settings).payload) : undefined;
    const state = StateSchema.parse(result);
    if (state.settings.clockMode === 'live') state.settings.now = new Date().toISOString();
    return state;
  }
  private write(state: State) {
    for (const table of tables) {
      const previous = new Map(this.db.prepare(`SELECT payload FROM ${table}`).all().map(row => {
        const payload = PayloadSchema.parse(row).payload;
        const item = z.object({ id: z.string() }).parse(JSON.parse(payload));
        return [item.id, payload];
      }));
      const upsert = this.db.prepare(`INSERT INTO ${table}(id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload`);
      for (const item of state[table]) {
        const payload = JSON.stringify(item);
        if (previous.get(item.id) !== payload) upsert.run(item.id, payload);
        previous.delete(item.id);
      }
      for (const id of previous.keys()) this.db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);
    }
    this.db.prepare("INSERT INTO settings(id,payload) VALUES ('community',?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(JSON.stringify(state.settings));
  }
  transaction<T>(operation: (state: State) => T): T {
    return this.db.transaction(() => {
      const state = this.read();
      const result = operation(state);
      new FollowUpService().reconcile(state);
      this.write(StateSchema.parse(state));
      return result;
    }).immediate();
  }
  replace(state: State): void { this.db.transaction(() => this.write(StateSchema.parse(state))).immediate(); }
  close() { this.db.close(); }
}
