import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const destination = resolve(root, '.next/standalone');
await mkdir(resolve(destination, 'scripts'), { recursive: true });
await cp(resolve(root, 'public'), resolve(destination, 'public'), { recursive: true });
await cp(resolve(root, '.next/static'), resolve(destination, '.next/static'), { recursive: true });
for (const name of ['account-role.mjs', 'recovery-outbox.mjs', 'start.mjs']) {
  await cp(resolve(root, 'scripts', name), resolve(destination, 'scripts', name));
}
process.stdout.write('Prepared standalone assets and Node operator CLI.\n');
