import { randomUUID } from 'node:crypto';
import type { Command } from './commands';
import { requireCondition, type Resource, type State, type User } from './model';
export { resourceIsFresh } from './resource-availability';

type CreateInput = Extract<Command, { type: 'createResource' }>['input'];
type EditInput = Extract<Command, { type: 'editResource' }>['input'];

export class ResourceService {
  create(state: State, actor: User, input: CreateInput): string {
    requireCondition(actor.role === 'organization' && actor.verified, 'Verified organization permission is required.', 403);
    this.checkQualification(actor, input.category);
    this.checkCapacity(input.capacity, 0);
    const id = randomUUID();
    state.resources.push({ ...input, id, ownerId: actor.id, communityId: actor.communityId, reserved: 0, active: true, verifiedAt: state.settings.now, readyForEvent: null });
    return id;
  }

  edit(state: State, actor: User, id: string, input: EditInput): void {
    const resource = this.owned(state, actor, id);
    this.checkQualification(actor, input.category);
    this.checkCapacity(input.capacity, resource.reserved);
    requireCondition(!state.commitments.some(c => c.resourceId === id) || (resource.category === input.category && resource.capacityMode === input.capacityMode), 'Category and capacity mode are frozen by commitment history.');
    const { ready, ...fields } = input;
    Object.assign(resource, fields, { verifiedAt: state.settings.now, readyForEvent: ready ? state.settings.emergency?.id ?? null : null });
  }

  setAvailability(state: State, actor: User, id: string, capacity: number, active: boolean, ready: boolean): void {
    const resource = this.owned(state, actor, id);
    this.checkCapacity(capacity, resource.reserved);
    Object.assign(resource, { capacity, active, verifiedAt: state.settings.now, readyForEvent: ready ? state.settings.emergency?.id ?? null : null });
  }

  private owned(state: State, actor: User, id: string): Resource {
    const resource = state.resources.find(r => r.id === id && r.communityId === actor.communityId);
    requireCondition(resource, 'Resource not found.', 404);
    requireCondition(actor.role === 'organization' && actor.id === resource.ownerId, 'Only the organization owner may edit this resource.', 403);
    return resource;
  }

  private checkQualification(actor: User, category: CreateInput['category']): void {
    requireCondition(category !== 'Medical' || (actor.verified && actor.qualifiedCategories.includes('Medical')), 'Verified medical qualification is required.', 403);
  }

  private checkCapacity(capacity: number, reserved: number): void {
    requireCondition(Number.isInteger(capacity) && capacity >= 1 && capacity >= reserved && capacity <= 10000, 'Capacity must be positive, cover current reservations and be at most 10,000.');
  }
}
