import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { DisasterPeopleService } from '../src/domain/disaster-people';
import { seedState } from '../src/domain/seed';
import { SqliteRepository } from '../src/server/repository';

it('persists private reports, review history and self check-ins across SQLite reopen', () => {
  const dir = mkdtempSync(join(tmpdir(), 'disaster-people-'));
  const path = join(dir, 'network.sqlite');
  let repo: SqliteRepository | undefined;
  try {
    repo = new SqliteRepository(path);
    repo.replace(seedState());
    const people = new DisasterPeopleService(repo);
    people.execute('u-mira', { action: 'report', personName: 'Fictional Testperson', relationship: 'neighbor', area: 'Riverside', ageGroup: 'under_18', lastSeenAt: null, lastKnownContext: 'Fictional context', authorized: true, shareWithCommunity: true });
    const report = people.list('u-mira').records[0];
    expect(report).toBeDefined();
    if (!report) throw new Error('Report was not created');
    people.execute('u-eli', { action: 'tip', id: report.id, text: 'Fictional tip' });
    people.execute('u-coord', { action: 'request_information', id: report.id, question: 'Fictional question' });
    people.execute('u-mira', { action: 'reply_information', id: report.id, reply: 'Fictional reply' });
    people.execute('u-mira', { action: 'check_in', area: 'Riverside' });
    repo.close();
    repo = new SqliteRepository(path);
    const reopened = new DisasterPeopleService(repo);
    const own = reopened.list('u-mira').records;
    expect(own.find(record => record.id === report.id)).toMatchObject({ status: 'under_review', tips: [{ authorId: 'u-eli', text: 'Fictional tip' }], history: [{ status: 'submitted', actorId: 'u-mira' }, { action: 'information_requested', actorId: 'u-coord' }, { action: 'information_replied', actorId: 'u-mira' }] });
    expect(own.find(record => record.kind === 'safe_check_in')).toMatchObject({ authorId: 'u-mira', personName: null });
    expect(reopened.list('u-coord').records).toHaveLength(2);
    expect(reopened.list('u-eli').records).toEqual([]);
    expect(reopened.list('u-eli').communityNotices).toEqual([{ id: report.id, area: 'Riverside', status: 'under_review', personName: null }]);
    expect(reopened.list('u-other').communityNotices).toEqual([]);
    expect(() => reopened.execute('u-other', { action: 'tip', id: report.id, text: 'Cross-community tip' })).toThrow();
    reopened.execute('u-mira', { action: 'set_visibility', id: report.id, shared: false });
    expect(reopened.list('u-eli').communityNotices).toEqual([]);
    expect(() => reopened.execute('u-eli', { action: 'tip', id: report.id, text: 'Late tip' })).toThrow();
    expect(reopened.list('u-other').records).toEqual([]);
    expect(() => reopened.execute('u-other', { action: 'review', id: report.id, status: 'closed' })).toThrow();
  } finally {
    repo?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
