import { constants, closeSync, existsSync, fstatSync, openSync, readFileSync } from 'node:fs';

for (const name of ['.env.local', '.env']) if (existsSync(name)) process.loadEnvFile(name);

const path = process.env.RECOVERY_OUTBOX_PATH || 'data/recovery-outbox.jsonl';
const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
try {
  const file = fstatSync(fd);
  if (!file.isFile() || (file.mode & 0o077) !== 0 || (process.getuid && file.uid !== process.getuid()) || file.nlink !== 1) throw new Error('Outbox must be a private, owner-only regular file.');
  const records = readFileSync(fd, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const email = process.argv[2];
  const matching = email ? records.filter(record => record.email.toLowerCase() === email.toLowerCase()) : records;
  const record = matching.at(-1);
  if (!record) throw new Error('No matching recovery message.');
  process.stdout.write(`Local recovery message for ${record.email} (${record.createdAt})\n${record.url}\n`);
} finally { closeSync(fd); }
