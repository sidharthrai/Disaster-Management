import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const env = { ...process.env, NEXT_DIST_DIR: '.next/demo-production' };
for (const args of [
  [resolve('node_modules/next/dist/bin/next'), 'build'],
  [resolve('scripts/prepare-standalone.mjs')],
]) {
  const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
  const code = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (status, signal) => resolveExit(status ?? (signal ? 1 : 0)));
  });
  if (code !== 0) process.exit(code);
}
