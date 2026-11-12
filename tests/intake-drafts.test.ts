import { expect, it } from 'vitest';
import { IntakeDraftCommandSchema, IntakeDraftListSchema, IntakeDraftResponseSchema, IntakeDraftsService } from '../src/domain/intake-drafts';
import { seedState } from '../src/domain/seed';
import { SqliteRepository } from '../src/server/repository';

it('keeps incomplete drafts private and permits author and community coordinator review', () => {
  const repo = new SqliteRepository(':memory:');
  try {
    repo.replace(seedState()); const service = new IntakeDraftsService(repo);
    const initialRequests = repo.read().requests.length;
    const { draft } = service.execute('u-mira', { action: 'create', input: { text: 'Need a hand sometime', source: 'Phone transcript' } });
    expect(IntakeDraftResponseSchema.parse({ draft }).draft.id).toBe(draft.id);
    expect(repo.read().requests).toHaveLength(initialRequests);
    expect(service.list('u-mira').drafts).toHaveLength(1);
    expect(service.list('u-coord').drafts[0]?.text).toBe('Need a hand sometime');
    expect(service.list('u-eli').drafts).toHaveLength(0);
    expect(service.list('u-other').drafts).toHaveLength(0);
    expect(() => service.execute('u-other', { action: 'request_information', id: draft.id, note: 'Where?' })).toThrow();
    expect(() => service.execute('u-eli', { action: 'update', id: draft.id, input: { text: 'Another message', source: 'Website' } })).toThrow();
    service.execute('u-coord', { action: 'request_information', id: draft.id, note: 'What neighborhood?' });
    expect(service.list('u-mira').drafts[0]?.requestedInfo).toBe('What neighborhood?');
    service.execute('u-mira', { action: 'update', id: draft.id, input: { text: 'Need groceries later', source: 'Website' } });
    expect(IntakeDraftListSchema.parse(service.list('u-mira')).drafts[0]).toMatchObject({ text: 'Need groceries later', source: 'Website', status: 'awaiting_details' });
    expect(() => service.execute('u-coord', { action: 'withdraw', id: draft.id })).toThrow();
    expect(() => service.execute('u-mira', { action: 'convert', id: draft.id, requestId: 'req-multi' })).toThrow();
    service.execute('u-mira', { action: 'convert', id: draft.id, requestId: 'req-grocery' });
    expect(service.list('u-mira').drafts[0]).toMatchObject({ status: 'converted', requestId: 'req-grocery' });
    expect(() => service.execute('u-mira', { action: 'withdraw', id: draft.id })).toThrow();
    expect(service.list('u-mira').drafts[0]?.history.map(item => item.action)).toEqual(['created', 'information_requested', 'updated', 'converted']);
  } finally { repo.close(); }
});

it('validates boundaries and makes withdrawal terminal', () => {
  const repo = new SqliteRepository(':memory:');
  try {
    repo.replace(seedState()); const service = new IntakeDraftsService(repo);
    expect(() => service.execute('u-mira', { action: 'create', input: { text: 'short', source: 'Website' } })).toThrow();
    expect(IntakeDraftCommandSchema.safeParse({ action: 'create', input: { text: 'Long enough', source: 'Website', area: 'Riverside' } }).success).toBe(false);
    const { draft } = service.execute('u-mira', { action: 'create', input: { text: 'Need help later', source: 'Website' } });
    expect(() => service.execute('u-coord', { action: 'request_information', id: draft.id, note: ' '.repeat(4) })).toThrow();
    expect(() => service.execute('u-coord', { action: 'request_information', id: draft.id, note: 'x'.repeat(1001) })).toThrow();
    service.execute('u-mira', { action: 'withdraw', id: draft.id });
    expect(service.list('u-mira').drafts[0]?.status).toBe('withdrawn');
    expect(() => service.execute('u-coord', { action: 'request_information', id: draft.id, note: 'Where?' })).toThrow();
    expect(() => service.execute('u-mira', { action: 'convert', id: draft.id, requestId: 'req-grocery' })).toThrow();
  } finally { repo.close(); }
});
