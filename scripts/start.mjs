import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
for (const name of ['.env.local', '.env']) {
  const path = resolve(root, name);
  if (existsSync(path)) process.loadEnvFile(path);
}
const mode = process.env.APP_MODE || 'demo';
process.env.NODE_ENV ||= 'production';
process.env.HOSTNAME ||= '127.0.0.1';
process.env.PORT ||= '3000';
process.env.DATABASE_PATH = resolve(root, process.env.DATABASE_PATH || (mode === 'accounts' ? 'data/accounts-community.sqlite' : 'data/community.sqlite'));
process.env.AUTH_DATABASE_PATH = resolve(root, process.env.AUTH_DATABASE_PATH || 'data/accounts-auth.sqlite');
process.env.RECOVERY_OUTBOX_PATH = resolve(root, process.env.RECOVERY_OUTBOX_PATH || 'data/recovery-outbox.jsonl');
const server = existsSync(resolve(root, 'server.js')) ? resolve(root, 'server.js') : resolve(root, '.next/standalone/server.js');
if (!existsSync(server)) throw new Error('Build the application before starting it.');
await import(pathToFileURL(server).href);
