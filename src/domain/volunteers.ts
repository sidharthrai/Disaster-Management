import { z } from 'zod';
import { AreaSchema, CategorySchema, VolunteerProfileSchema, requireCondition } from './model';
import type { Repository } from './store';

export const volunteerCategories = ['Groceries', 'Transport', 'Supplies', 'Community', 'Shelter'] as const;
export const VolunteerCategorySchema = z.enum(volunteerCategories);
export const VolunteerLanguageSchema = VolunteerProfileSchema.shape.languages.element;
export const volunteerLanguages = VolunteerLanguageSchema.options;
const unique = <T>(values: T[]) => new Set(values).size === values.length;
export const VolunteerProfileInputSchema = z.strictObject({
  categories: z.array(VolunteerCategorySchema).max(5).refine(unique, 'Choose each capability once.'),
  areas: z.array(AreaSchema).max(5).refine(unique, 'Choose each area once.'),
  languages: z.array(VolunteerLanguageSchema).max(6).refine(unique, 'Choose each language once.'),
  visible: z.boolean(),
});
export const VolunteerDirectorySchema = z.strictObject({
  ownProfile: VolunteerProfileInputSchema.nullable(),
  volunteers: z.array(z.strictObject({ id: z.string(), name: z.string(), categories: z.array(VolunteerCategorySchema), areas: z.array(AreaSchema), languages: z.array(VolunteerLanguageSchema), eligibleOfferCount: z.number().int().nonnegative() })),
});
export const VolunteerSaveResponseSchema = z.strictObject({ ok: z.literal(true) });
export type VolunteerProfileInput = z.infer<typeof VolunteerProfileInputSchema>;
export type VolunteerDirectory = z.infer<typeof VolunteerDirectorySchema>;

function projectedProfile(profile: { categories: z.infer<typeof CategorySchema>[]; areas: z.infer<typeof AreaSchema>[]; languages: z.infer<typeof VolunteerLanguageSchema>[]; visible: boolean }): VolunteerProfileInput {
  return { categories: profile.categories.flatMap(category => { const parsed = VolunteerCategorySchema.safeParse(category); return parsed.success ? [parsed.data] : []; }), areas: profile.areas, languages: profile.languages, visible: profile.visible };
}

export class VolunteersService {
  constructor(private readonly repository: Repository) {}
  list(actorId: string): VolunteerDirectory {
    const state = this.repository.read();
    const actor = state.users.find(user => user.id === actorId);
    requireCondition(actor, 'Sign in required.', 401);
    const own = actor.role === 'member' ? state.volunteerProfiles.find(profile => profile.id === actor.id && profile.communityId === actor.communityId) : undefined;
    const now = Date.parse(state.settings.now);
    const volunteers = state.volunteerProfiles.flatMap(profile => {
      const user = state.users.find(item => item.id === profile.id && item.communityId === actor.communityId && item.role === 'member');
      if (!user || profile.communityId !== actor.communityId || !profile.visible) return [];
      const eligibleOfferCount = state.offers.filter(offer => {
        const start = Date.parse(offer.startAt); const end = Date.parse(offer.endAt);
        return offer.userId === user.id && offer.communityId === actor.communityId && offer.active && offer.categories.some(category => VolunteerCategorySchema.safeParse(category).success) && Number.isFinite(now) && Number.isFinite(start) && Number.isFinite(end) && start < end && end > now && (!state.settings.emergency || offer.readyForEvent === state.settings.emergency.id);
      }).length;
      const { categories, areas, languages } = projectedProfile(profile);
      return [{ id: user.id, name: user.name, categories, areas, languages, eligibleOfferCount }];
    });
    return VolunteerDirectorySchema.parse({ ownProfile: own ? projectedProfile(own) : null, volunteers });
  }
  save(actorId: string, input: unknown): void {
    const profile = VolunteerProfileInputSchema.parse(input);
    this.repository.transaction(state => {
      const actor = state.users.find(user => user.id === actorId);
      requireCondition(actor, 'Sign in required.', 401);
      requireCondition(actor.role === 'member', 'Only members can edit a volunteer profile.', 403);
      const record = VolunteerProfileSchema.parse({ id: actor.id, communityId: actor.communityId, ...profile, updatedAt: new Date().toISOString() });
      const index = state.volunteerProfiles.findIndex(item => item.id === actor.id);
      if (index < 0) state.volunteerProfiles.push(record); else state.volunteerProfiles[index] = record;
    });
  }
}
