import type { Resource, Settings, User } from '../domain/model';
import { resourceIsFresh } from '../domain/resource-availability';

export type SupportCategory = 'Shelter' | 'Transport';

export type SupportListing = {
  resource: Resource;
  owner: User | undefined;
  availableUnits: number;
  reasons: string[];
  generallyAvailable: boolean;
};

export function disasterSupportListings({ resources, users, actor, settings }: {
  resources: Resource[];
  users: User[];
  actor: User;
  settings: Settings;
}): SupportListing[] {
  const owners = new Map(users.filter(user => user.communityId === actor.communityId).map(user => [user.id, user]));
  return resources.filter(resource => resource.communityId === actor.communityId && (resource.category === 'Shelter' || resource.category === 'Transport')).map(resource => {
    const owner = owners.get(resource.ownerId);
    const reasons: string[] = [];
    if (!resource.active) reasons.push('Paused');
    if (resource.capacity <= resource.reserved) reasons.push('No remaining capacity');
    if (!resourceIsFresh(resource, settings.now)) reasons.push('Availability is stale or invalid');
    if (settings.emergency && resource.readyForEvent !== settings.emergency.id) reasons.push('Incident readiness not confirmed');
    if (!owner || owner.role !== 'organization' || !owner.verified) reasons.push('Partner is not currently eligible');
    return { resource, owner, availableUnits: Math.max(0, resource.capacity - resource.reserved), reasons, generallyAvailable: reasons.length === 0 };
  }).sort((a, b) => Number(b.generallyAvailable) - Number(a.generallyAvailable) || a.resource.name.localeCompare(b.resource.name));
}
