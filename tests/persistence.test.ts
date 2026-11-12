import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';
import { SqliteRepository } from '../src/server/repository';
import { NetworkService } from '../src/domain/network';
import { seedState } from '../src/domain/seed';

it('migrates legacy messages without assigning participants and persists across reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'community-network-'));
  const path = join(dir, 'network.sqlite');
  try {
    const repository = new SqliteRepository(path);
    const seed = seedState();
    seed.messages.push({ id: 'old-note', requestId: 'req-grocery', commitmentId: null, actorId: 'u-mira', text: 'Legacy private note', at: seed.settings.now });
    repository.replace(seed); repository.close();
    const db = new Database(path);
    db.exec("UPDATE messages SET payload = json_remove(payload, '$.commitmentId'); UPDATE resources SET payload = json_remove(payload, '$.capacityMode')");
    db.close();
    for (let i = 0; i < 2; i++) {
      const reopened = new SqliteRepository(path);
      const network = new NetworkService(reopened);
      expect(network.detail('u-mira', 'req-grocery').messages).toMatchObject([{ commitmentId: null, text: 'Legacy private note' }]);
      expect(network.detail('u-eli', 'req-grocery').messages).toEqual([]);
      expect(reopened.read().resources.every(r => r.capacityMode === 'concurrent')).toBe(true);
      reopened.close();
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('migrates legacy coordinator fields without granting qualifications', () => {
  const repository = new SqliteRepository(':memory:');
  try {
    const seed = seedState();
    repository.replace(seed);
    const original = repository.read().requests[0]!;
    // Verify the schema accepts pre-feature records without granting new privileges.
    const legacy = structuredClone(seed);
    const raw = JSON.parse(JSON.stringify(legacy));
    delete raw.requests[0].assignedCoordinatorId;
    delete raw.requests[0].updatedAt;
    delete raw.requests[0].incidentId;
    delete raw.users[0].qualifiedCategories;
    delete raw.users[0].synthetic;
    delete raw.coordinatorNotes;
    delete raw.followUpEpisodes;
    delete raw.notifications;
    repository.replace(raw);
    const restored = repository.read();
    expect(restored.requests[0]).toMatchObject({ id: original.id, assignedCoordinatorId: null, incidentId: null, updatedAt: original.createdAt });
    expect(restored.users[0]).toMatchObject({ synthetic: true, qualifiedCategories: [] });
    expect(restored.coordinatorNotes).toEqual([]);
  } finally { repository.close(); }
});
