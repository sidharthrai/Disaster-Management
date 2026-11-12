import { resolve } from 'node:path';

export function appMode(): 'demo' | 'accounts' {
  const mode = process.env.APP_MODE || 'demo';
  if (mode !== 'demo' && mode !== 'accounts') throw new Error('APP_MODE must be demo or accounts.');
  return mode;
}
export function accountConfig() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.APP_BASE_URL;
  if (!secret || secret.length < 32) throw new Error('Account mode requires BETTER_AUTH_SECRET of at least 32 characters.');
  if (!baseURL) throw new Error('Account mode requires APP_BASE_URL.');
  const url = new URL(baseURL);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_BASE_URL must be an HTTP(S) origin.');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Production APP_BASE_URL must use HTTPS.');
  return { secret, baseURL: url.origin };
}
export const operationPath = () => resolve(process.cwd(), process.env.DATABASE_PATH || (appMode() === 'accounts' ? 'data/accounts-community.sqlite' : 'data/community.sqlite'));
export const authPath = () => resolve(process.cwd(), process.env.AUTH_DATABASE_PATH || 'data/accounts-auth.sqlite');
