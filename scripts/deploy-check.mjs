import { resolve } from 'node:path';

const mode = process.env.APP_MODE || 'demo';
const problems = [];
if (!['demo', 'accounts'].includes(mode)) problems.push('APP_MODE must be demo or accounts.');
if (mode === 'accounts') {
  const operationPath = resolve(process.env.DATABASE_PATH || 'data/accounts-community.sqlite');
  const authPath = resolve(process.env.AUTH_DATABASE_PATH || 'data/accounts-auth.sqlite');
  if (operationPath === authPath) problems.push('Authentication and community databases must use separate paths.');
  if ((process.env.BETTER_AUTH_SECRET || '').length < 32) problems.push('BETTER_AUTH_SECRET must have at least 32 characters.');
  try {
    const url = new URL(process.env.APP_BASE_URL || '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error();
  } catch { problems.push('APP_BASE_URL must be an HTTP(S) origin; production requires HTTPS except localhost.'); }
}
if (problems.length) { for (const problem of problems) process.stderr.write(`${problem}\n`); process.exitCode = 1; }
else process.stdout.write(`Configuration valid for ${mode} mode. Ensure SQLite data is on durable storage and backed up.\n`);
