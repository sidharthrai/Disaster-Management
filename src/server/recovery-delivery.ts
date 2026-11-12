import { constants, closeSync, fstatSync, lstatSync, mkdirSync, openSync, writeSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function isLocalRecoveryOrigin(baseURL: string): boolean {
  const url = new URL(baseURL);
  return ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}

export function writeRecoveryMessage(message: { email: string; url: string }): void {
  const path = fileURLToPath(pathToFileURL(process.env.RECOVERY_OUTBOX_PATH || 'data/recovery-outbox.jsonl'));
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const dir = lstatSync(directory);
  if (!dir.isDirectory() || (dir.mode & 0o022) !== 0 || (process.getuid && dir.uid !== process.getuid())) {
    throw new Error('Recovery outbox directory must be owned by this user and not writable by others.');
  }
  const fd = openSync(path, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW, 0o600);
  try {
    const file = fstatSync(fd);
    if (!file.isFile() || (file.mode & 0o077) !== 0 || (process.getuid && file.uid !== process.getuid()) || file.nlink !== 1) {
      throw new Error('Recovery outbox must be a private, owner-only regular file.');
    }
    writeSync(fd, `${JSON.stringify({ ...message, createdAt: new Date().toISOString() })}\n`);
  } finally { closeSync(fd); }
}
