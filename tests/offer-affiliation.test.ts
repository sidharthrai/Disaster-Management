import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { CreateOfferSchema } from '../src/domain/inputs';
import { MatchingService } from '../src/domain/matching';
import { OfferSchema } from '../src/domain/model';
import { NetworkService } from '../src/domain/network';
import { OfferScheduleSchema, OfferScheduleService } from '../src/domain/offer-schedule';
import { seedState } from '../src/domain/seed';
import { SqliteRepository } from '../src/server/repository';

it('persists optional self-described affiliations without changing qualification or matching', () => {
  const dir = mkdtempSync(join(tmpdir(), 'offer-affiliation-'));
  const path = join(dir, 'network.sqlite');
  try {
    const repo = new SqliteRepository(path);
    repo.replace(seedState());
    const beforeUser = repo.read().users.find(user => user.id === 'u-eli');
    const normal = { description: 'I can deliver supplies.', categories: ['Supplies' as const], area: 'Riverside' as const, startAt: '2026-11-15T15:00:00.000Z', endAt: '2026-11-15T17:00:00.000Z' };
    const id = new NetworkService(repo).createOffer('u-eli', { ...normal, affiliation: '  Neighbors United  ' });
    const ids = new OfferScheduleService(repo).create('u-eli', { description: normal.description, categories: normal.categories, areas: ['Riverside'], startLocal: '2026-11-15T09:00', endLocal: '2026-11-15T11:00', weeks: 2, confirmed: true, affiliation: '  Neighbors United  ' });
    expect(repo.read().users.find(user => user.id === 'u-eli')).toEqual(beforeUser);
    const network = new NetworkService(repo);
    expect(network.snapshot('u-eli').offers.find(offer => offer.id === id)?.affiliation).toBe('Neighbors United');
    expect(network.snapshot('u-mira').offers.find(offer => offer.id === id)?.affiliation).toBeUndefined();
    expect(JSON.stringify(network.publicOverview())).not.toContain('Neighbors United');
    repo.close();
    const reopened = new SqliteRepository(path);
    try {
      const state = reopened.read();
      expect(state.offers.filter(offer => [id, ...ids].includes(offer.id)).map(offer => offer.affiliation)).toEqual(['Neighbors United', 'Neighbors United', 'Neighbors United']);
      const viewer = state.users.find(user => user.id === 'u-mira');
      const base = state.requests.find(request => request.id === 'req-grocery');
      expect(viewer).toBeDefined(); expect(base).toBeDefined();
      if (!viewer || !base) throw new Error('Missing seed data');
      const request = { ...base, area: 'Riverside' as const, windowStart: normal.startAt, windowEnd: normal.endAt, restricted: false, needs: [{ id: 'affiliation-need', category: 'Supplies' as const, status: 'open' as const }] };
      const matcher = new MatchingService();
      const withAffiliation = matcher.find(state, request, viewer);
      expect(withAffiliation.some(match => match.id === id)).toBe(true);
      const withoutAffiliation = structuredClone(state);
      for (const offer of withoutAffiliation.offers) delete offer.affiliation;
      expect(matcher.find(withoutAffiliation, request, viewer)).toEqual(withAffiliation);
      expect(state.users.find(user => user.id === 'u-eli')).toEqual(beforeUser);
    } finally { reopened.close(); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('accepts old records and blank affiliation while rejecting overlong input', () => {
  const input = { description: 'I can deliver supplies.', categories: ['Supplies'], area: 'Riverside', startAt: '2026-11-15T15:00:00.000Z', endAt: '2026-11-15T17:00:00.000Z' };
  expect(CreateOfferSchema.parse({ ...input, affiliation: '   ' }).affiliation).toBeUndefined();
  expect(() => CreateOfferSchema.parse({ ...input, affiliation: 'x'.repeat(121) })).toThrow();
  const schedule = { description: input.description, categories: input.categories, areas: [input.area], startLocal: '2026-11-15T09:00', endLocal: '2026-11-15T11:00', weeks: 1, confirmed: true };
  expect(OfferScheduleSchema.parse({ ...schedule, affiliation: '  ' }).affiliation).toBeUndefined();
  expect(() => OfferScheduleSchema.parse({ ...schedule, affiliation: 'x'.repeat(121) })).toThrow();
  const oldOffer = seedState().offers[0];
  expect(oldOffer).toBeDefined();
  expect(OfferSchema.parse(oldOffer).affiliation).toBeUndefined();
});
