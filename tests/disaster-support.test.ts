import { describe, expect, it } from 'vitest';
import { buildEmergencyDashboard } from '../src/domain/emergency';
import { seedState } from '../src/domain/seed';
import { disasterSupportListings } from '../src/lib/disaster-support';

describe('disaster shelter and transport listings', () => {
  it('matches coordinator readiness rules and excludes other communities and categories', () => {
    const state = seedState();
    const actor = state.users.find(user => user.id === 'u-coord')!;
    state.settings.emergency = { id: 'event', type: 'Flood', name: 'Flood', startedAt: state.settings.now };
    for (const resource of state.resources) resource.readyForEvent = 'event';
    const shelter = state.resources.find(resource => resource.category === 'Shelter')!;
    const transport = state.resources.find(resource => resource.category === 'Transport')!;
    shelter.reserved = shelter.capacity;
    transport.verifiedAt = '2020-01-01T00:00:00.000Z';
    state.resources.push({ ...shelter, id: 'outside', communityId: 'other' });
    const listings = disasterSupportListings({ resources: state.resources, users: state.users, actor, settings: state.settings });
    const expected = buildEmergencyDashboard(state, actor).resources.list.filter(resource => resource.category === 'Shelter' || resource.category === 'Transport');
    expect(listings.map(listing => listing.resource.id).sort()).toEqual(expected.map(resource => resource.id).sort());
    for (const listing of listings) expect(listing.generallyAvailable).toBe(expected.find(resource => resource.id === listing.resource.id)?.eligible);
    expect(listings.find(listing => listing.resource.id === shelter.id)).toMatchObject({ availableUnits: 0, reasons: ['No remaining capacity'] });
    expect(listings.find(listing => listing.resource.id === transport.id)?.reasons).toContain('Availability is stale or invalid');
  });

  it('requires an eligible partner and incident readiness and handles future timestamps as invalid', () => {
    const state = seedState();
    const actor = state.users.find(user => user.id === 'u-mira')!;
    state.settings.emergency = { id: 'event', type: 'Storm', name: 'Storm', startedAt: state.settings.now };
    const resource = state.resources.find(item => item.category === 'Shelter')!;
    resource.readyForEvent = null;
    resource.verifiedAt = new Date(Date.parse(state.settings.now) + 1000).toISOString();
    const owner = state.users.find(user => user.id === resource.ownerId)!;
    owner.verified = false;
    const listing = disasterSupportListings({ resources: state.resources, users: state.users, actor, settings: state.settings }).find(item => item.resource.id === resource.id)!;
    expect(listing.generallyAvailable).toBe(false);
    expect(listing.reasons).toEqual(expect.arrayContaining(['Availability is stale or invalid', 'Incident readiness not confirmed', 'Partner is not currently eligible']));
  });
});
