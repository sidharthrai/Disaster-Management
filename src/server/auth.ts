import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { accountConfig, authPath, operationPath } from './runtime-mode';
import { isLocalRecoveryOrigin, writeRecoveryMessage } from './recovery-delivery';

export async function createAuth() {
  const { secret, baseURL } = accountConfig();
  const path = authPath();
  if (path === operationPath()) throw new Error('Authentication and operation databases must be separate.');
  mkdirSync(dirname(path), { recursive: true });
  const database = new Database(path);
  database.pragma('journal_mode = WAL');
  database.pragma('busy_timeout = 5000');
  const options = { database, secret, baseURL, emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    ...(isLocalRecoveryOrigin(baseURL) ? { sendResetPassword: async ({ user, token }: { user: { email: string }; token: string }) => {
      const link = new URL('/reset-password', baseURL);
      link.hash = new URLSearchParams({ token }).toString();
      writeRecoveryMessage({ email: user.email, url: link.toString() });
    } } : {}),
  }, rateLimit: { enabled: true } };
  try {
    await (await getMigrations(options)).runMigrations();
    return betterAuth(options);
  } catch (error) { database.close(); throw error; }
}
const globalAuth = globalThis as typeof globalThis & { accountAuth?: ReturnType<typeof createAuth> };
export function auth() { return globalAuth.accountAuth ??= createAuth(); }
