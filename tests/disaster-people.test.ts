import { describe, expect, it } from 'vitest';
import { DisasterPeopleService } from '../src/domain/disaster-people';
import { PeopleRecordSchema } from '../src/domain/model';
import { seedState } from '../src/domain/seed';
import { SqliteRepository } from '../src/server/repository';

describe('private disaster people records', () => {
  it('isolates reports to their author and same-community coordinators and records review history', () => {
    const repository = new SqliteRepository(':memory:');
    try {
      const state = seedState(); repository.replace(state);
      const service = new DisasterPeopleService(repository);
      const report = { action: 'report', personName: 'Amina Solano', relationship: 'family', area: 'Riverside', ageGroup: 'under_18', authorized: true };
      service.execute('u-mira', report);
      const item = service.list('u-mira').records[0]!;
      expect(item).toMatchObject({ personName: 'Amina Solano', kind: 'missing', status: 'submitted', incidentId: null, ageGroup: 'under_18', lastSeenAt: null, lastKnownContext: '' });
      expect(service.list('u-coord').records).toHaveLength(1);
      expect(service.list('u-eli').records).toEqual([]);
      expect(service.list('u-other').records).toEqual([]);
      expect(() => service.execute('u-eli', { action: 'review', id: item.id, status: 'under_review' })).toThrow(/Coordinator/);
      expect(() => service.execute('u-other', { action: 'review', id: item.id, status: 'under_review' })).toThrow(/not found/);
      service.execute('u-coord', { action: 'review', id: item.id, status: 'under_review' });
      service.execute('u-coord', { action: 'review', id: item.id, status: 'closed' });
      expect(service.list('u-mira').records[0]?.history.map(entry => entry.status)).toEqual(['submitted', 'under_review', 'closed']);
      expect(repository.read().requests.some(request => JSON.stringify(request).includes('Amina Solano'))).toBe(false);
    } finally { repository.close(); }
  });
  it('requires an age group and legitimate reason, rejects extra details and creates a self-only check-in', () => {
    const repository = new SqliteRepository(':memory:');
    try {
      repository.replace(seedState()); const service = new DisasterPeopleService(repository);
      const report = { action: 'report', personName: 'Amina Solano', relationship: 'family', area: 'Riverside', ageGroup: 'under_18', authorized: true };
      expect(() => service.execute('u-mira', { ...report, ageGroup: 'invalid' })).toThrow();
      expect(() => service.execute('u-mira', { ...report, authorized: false })).toThrow();
      expect(() => service.execute('u-mira', { ...report, personName: 'Amina 123 Main St' })).toThrow();
      expect(() => service.execute('u-mira', { ...report, address: 'private address' })).toThrow();
      expect(() => service.execute('u-mira', { action: 'check_in', area: 'Riverside', authorId: 'u-eli' })).toThrow();
      service.execute('u-mira', { action: 'check_in', area: 'Riverside' });
      expect(service.list('u-mira').records[0]).toMatchObject({ kind: 'safe_check_in', authorId: 'u-mira', personName: null });
      expect(() => service.execute('u-coord', { action: 'review', id: service.list('u-mira').records[0]!.id, status: 'closed' })).toThrow(/not found/);
    } finally { repository.close(); }
  });
  it('keeps questions and replies private and limits replies to the author', () => {
    const repository = new SqliteRepository(':memory:');
    try {
      repository.replace(seedState()); const service = new DisasterPeopleService(repository);
      service.execute('u-mira', { action: 'report', personName: 'Amina Solano', relationship: 'family', area: 'Riverside', ageGroup: 'unknown', lastSeenAt: '2026-11-10T12:30:00.000Z', lastKnownContext: 'At a community gathering', authorized: true });
      const id = service.list('u-mira').records[0]!.id;
      expect(() => service.execute('u-eli', { action: 'request_information', id, question: 'When?' })).toThrow(/Coordinator/);
      expect(() => service.execute('u-other', { action: 'request_information', id, question: 'When?' })).toThrow(/not found/);
      service.execute('u-coord', { action: 'request_information', id, question: 'When did you last hear from them?' });
      expect(() => service.execute('u-coord', { action: 'request_information', id, question: 'Another question' })).toThrow(/Wait/);
      expect(() => service.execute('u-coord', { action: 'reply_information', id, reply: 'Yesterday' })).toThrow(/author/);
      expect(() => service.execute('u-eli', { action: 'reply_information', id, reply: 'Yesterday' })).toThrow(/author/);
      service.execute('u-mira', { action: 'reply_information', id, reply: 'Yesterday afternoon' });
      expect(() => service.execute('u-mira', { action: 'reply_information', id, reply: 'Again' })).toThrow(/unanswered/);
      const record = service.list('u-coord').records[0]!;
      expect(record).toMatchObject({ ageGroup: 'unknown', lastSeenAt: '2026-11-10T12:30:00.000Z', lastKnownContext: 'At a community gathering', status: 'under_review' });
      expect(record.history.map(entry => entry.action)).toEqual(['status_changed', 'information_requested', 'information_replied']);
      expect(record.history[record.history.length - 1]?.note).toBe('Yesterday afternoon');
      expect(service.list('u-eli').records).toEqual([]);
      expect(service.list('u-other').records).toEqual([]);
    } finally { repository.close(); }
  });
  it('defaults legacy records without inventing their age or last-seen time', () => {
    const repository = new SqliteRepository(':memory:');
    try {
      repository.replace(seedState());
      const legacy = { id: 'legacy', communityId: 'riverton', authorId: 'u-mira', incidentId: null, area: 'Riverside', createdAt: '2026-11-10T12:30:00.000Z', kind: 'missing', personName: 'Amina Solano', relationship: 'family', status: 'submitted', history: [{ status: 'submitted', actorId: 'u-mira', at: '2026-11-10T12:30:00.000Z' }] };
      const parsed = PeopleRecordSchema.parse(legacy);
      expect(parsed).toMatchObject({ ageGroup: 'unknown', lastSeenAt: null, lastKnownContext: '', history: [{ action: 'status_changed', note: '' }] });
    } finally { repository.close(); }
  });

  it('shares only redacted notices and permits private tips only while shared in the same community', () => {
    const repository = new SqliteRepository(':memory:');
    try {
      repository.replace(seedState()); const service = new DisasterPeopleService(repository);
      service.execute('u-mira', { action: 'report', personName: 'Amina Solano', relationship: 'family', area: 'Riverside', ageGroup: 'under_18', lastKnownContext: 'Private details', authorized: true });
      const id = service.list('u-mira').records[0]!.id;
      expect(service.list('u-eli').communityNotices).toEqual([]);
      expect(() => service.execute('u-eli', { action: 'tip', id, text: 'Private information' })).toThrow(/not found/);
      expect(() => service.execute('u-eli', { action: 'set_visibility', id, shared: true })).toThrow(/author/);
      service.execute('u-mira', { action: 'set_visibility', id, shared: true });
      expect(service.list('u-eli').communityNotices).toEqual([{ id, area: 'Riverside', status: 'submitted', personName: null }]);
      expect(service.list('u-other').communityNotices).toEqual([]);
      expect(() => service.execute('u-other', { action: 'tip', id, text: 'Outside community' })).toThrow(/not found/);
      service.execute('u-eli', { action: 'tip', id, text: 'I may have useful information' });
      const outsider = service.list('u-eli');
      expect(outsider.records).toEqual([]);
      expect(JSON.stringify(outsider)).not.toContain('Amina');
      expect(JSON.stringify(outsider)).not.toContain('under_18');
      expect(JSON.stringify(outsider)).not.toContain('Private details');
      expect(JSON.stringify(outsider)).not.toContain('useful information');
      expect(service.list('u-mira').records[0]?.tips[0]).toMatchObject({ authorId: 'u-eli', text: 'I may have useful information' });
      expect(service.list('u-coord').records[0]?.tips).toHaveLength(1);
      expect(service.list('u-coord').communityNotices).toEqual([{ id, area: 'Riverside', status: 'submitted', personName: null }]);
      service.execute('u-mira', { action: 'set_visibility', id, shared: false });
      expect(service.list('u-eli').communityNotices).toEqual([]);
      expect(() => service.execute('u-eli', { action: 'tip', id, text: 'Late information' })).toThrow(/not found/);
      expect(service.list('u-mira').records[0]?.tips).toHaveLength(1);
    } finally { repository.close(); }
  });
  it('shares only an opted-in self check-in and permits its author to remove it', () => {
    const repository = new SqliteRepository(':memory:');
    try {
      repository.replace(seedState()); const service = new DisasterPeopleService(repository);
      service.execute('u-mira', { action: 'check_in', area: 'Riverside', shareWithCommunity: true });
      const id = service.list('u-mira').records[0]!.id;
      const checkIn = service.list('u-eli').communityCheckIns[0]!;
      expect(checkIn).toEqual({ id, name: repository.read().users.find(user => user.id === 'u-mira')!.name, area: 'Riverside', status: 'self_reported_safe' });
      expect(service.list('u-other').communityCheckIns).toEqual([]);
      expect(() => service.execute('u-eli', { action: 'check_in', area: 'Riverside', authorId: 'u-mira' })).toThrow();
      expect(() => service.execute('u-eli', { action: 'tip', id, text: 'Not a report' })).toThrow(/not found/);
      service.execute('u-mira', { action: 'set_visibility', id, shared: false });
      expect(service.list('u-eli').communityCheckIns).toEqual([]);
    } finally { repository.close(); }
  });
  it('rejects a future last-seen time and retains unknown when omitted', () => {
    const repository = new SqliteRepository(':memory:');
    try {
      const state = seedState(); repository.replace(state); const service = new DisasterPeopleService(repository);
      const report = { action: 'report', personName: 'Amina Solano', relationship: 'friend', area: 'Riverside', ageGroup: 'unknown', authorized: true };
      const future = new Date(Date.parse(state.settings.now) + 60000).toISOString();
      expect(() => service.execute('u-mira', { ...report, lastSeenAt: future })).toThrow(/workspace time/);
      service.execute('u-mira', report);
      expect(service.list('u-mira').records[0]?.lastSeenAt).toBeNull();
    } finally { repository.close(); }
  });

  it('shares only an explicitly authorized adult name and clears consent when unshared', () => {
    const repository = new SqliteRepository(':memory:');
    try {
      repository.replace(seedState()); const service = new DisasterPeopleService(repository);
      const report = { action: 'report', personName: 'Amina Solano', relationship: 'friend', area: 'Riverside', ageGroup: 'adult', authorized: true, shareWithCommunity: true };
      expect(() => service.execute('u-mira', { ...report, ageGroup: 'under_18', shareAdultName: true })).toThrow(/adult name/);
      expect(() => service.execute('u-mira', { ...report, ageGroup: 'unknown', shareAdultName: true })).toThrow(/adult name/);
      expect(() => service.execute('u-mira', { ...report, shareWithCommunity: false, shareAdultName: true })).toThrow(/adult name/);
      service.execute('u-mira', { ...report, shareAdultName: true });
      const id = service.list('u-mira').records[0]!.id;
      expect(service.list('u-eli').communityNotices[0]).toEqual({ id, area: 'Riverside', status: 'submitted', personName: 'Amina Solano' });
      service.execute('u-mira', { action: 'set_visibility', id, shared: false });
      expect(service.list('u-eli').communityNotices).toEqual([]);
      service.execute('u-mira', { action: 'set_visibility', id, shared: true });
      expect(service.list('u-eli').communityNotices[0]?.personName).toBeNull();
    } finally { repository.close(); }
  });

});
