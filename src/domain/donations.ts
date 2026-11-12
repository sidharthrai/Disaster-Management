import { z } from 'zod';
import { AreaSchema, requireCondition, type State } from './model';

export const DonationCategorySchema = z.enum(['Groceries', 'Supplies']);
export const DonationBoardSchema = z.object({
  resources: z.array(z.object({ id: z.string(), category: DonationCategorySchema, area: AreaSchema, units: z.number().int().positive() }).strict()),
  offers: z.array(z.object({ id: z.string(), category: DonationCategorySchema, area: AreaSchema, startAt: z.string(), endAt: z.string() }).strict()),
}).strict();
export type DonationBoard = z.infer<typeof DonationBoardSchema>;

/** A community-facing allowlist; no request or free-text fields leave this projection. */
export function donationBoard(state: State, userId: string): DonationBoard {
  const actor = state.users.find(user => user.id === userId);
  requireCondition(actor, 'Choose a valid demo identity.', 401);
  const now = Date.parse(state.settings.now);
  const incident = state.settings.emergency?.id;
  const users = new Map(state.users.map(user => [user.id, user]));
  const resources: DonationBoard['resources'] = [];
  const offers: DonationBoard['offers'] = [];
  for (const resource of state.resources) {
    const category = DonationCategorySchema.safeParse(resource.category);
    const owner = users.get(resource.ownerId);
    const age = now - Date.parse(resource.verifiedAt);
    if (!category.success || resource.communityId !== actor.communityId || !owner || owner.communityId !== actor.communityId || owner.role !== 'organization' || !owner.verified || !resource.active || resource.capacityMode !== 'consumable' || resource.capacity <= resource.reserved || !Number.isFinite(age) || age < 0 || age > 24 * 3600000 || (incident && resource.readyForEvent !== incident)) continue;
    resources.push({ id: resource.id, category: category.data, area: resource.area, units: resource.capacity - resource.reserved });
  }
  for (const offer of state.offers) {
    const owner = users.get(offer.userId);
    const start = Date.parse(offer.startAt); const end = Date.parse(offer.endAt);
    if (offer.communityId !== actor.communityId || !owner || owner.communityId !== actor.communityId || !offer.active || !Number.isFinite(now) || !Number.isFinite(start) || !Number.isFinite(end) || end <= now || start >= end || (incident && offer.readyForEvent !== incident)) continue;
    for (const category of new Set(offer.categories)) {
      const parsed = DonationCategorySchema.safeParse(category);
      if (parsed.success) offers.push({ id: offer.id, category: parsed.data, area: offer.area, startAt: offer.startAt, endAt: offer.endAt });
    }
  }
  return { resources, offers };
}
