import { z } from 'zod';
import { AreaSchema, CategorySchema, requireCondition } from './model';
import type { Repository } from './store';

const website = z.string().trim().max(2048).refine(value => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Enter a valid HTTPS website without credentials.');
export const OrganizationProfileInputSchema = z.strictObject({
  about: z.string().trim().max(1000),
  services: z.array(CategorySchema).max(7).refine(values => new Set(values).size === values.length, 'Select each service once.'),
  serviceAreas: z.array(AreaSchema).max(5).refine(values => new Set(values).size === values.length, 'Select each area once.'),
  website,
});
export const OrganizationSaveResponseSchema = z.object({ ok: z.literal(true) });
export const OrganizationDirectorySchema = z.object({ organizations: z.array(z.object({
  id: z.string(), name: z.string(), verified: z.boolean(), synthetic: z.boolean(), qualifiedCategories: z.array(CategorySchema),
  profile: OrganizationProfileInputSchema.nullable(),
})) });
export type OrganizationDirectory = z.infer<typeof OrganizationDirectorySchema>;
export class OrganizationsService {
  constructor(private readonly repository: Repository) {}
  list(actorId: string) {
    const state = this.repository.read();
    const actor = state.users.find(user => user.id === actorId);
    requireCondition(actor, 'Sign in required.', 401);
    return { organizations: state.users.filter(user => user.role === 'organization' && user.communityId === actor.communityId).map(user => {
      const profile = state.organizationProfiles.find(item => item.id === user.id);
      return { id: user.id, name: user.name, verified: user.verified, synthetic: user.synthetic, qualifiedCategories: user.qualifiedCategories,
        profile: profile ? { about: profile.about, services: profile.services.filter(service => service !== 'Missing person' && (service !== 'Medical' || (user.verified && user.qualifiedCategories.includes('Medical')))), serviceAreas: profile.serviceAreas, website: website.safeParse(profile.website).success ? profile.website : '' } : null };
    }) };
  }
  save(actorId: string, input: unknown) {
    const profile = OrganizationProfileInputSchema.parse(input);
    return this.repository.transaction(state => {
      const actor = state.users.find(user => user.id === actorId);
      requireCondition(actor, 'Sign in required.', 401);
      requireCondition(actor.role === 'organization', 'Only organizations can edit an organization profile.', 403);
      requireCondition(!profile.services.includes('Missing person'), 'Missing-person services cannot be advertised.', 403);
      requireCondition(!profile.services.includes('Medical') || (actor.verified && actor.qualifiedCategories.includes('Medical')), 'Medical services require existing verification and qualification.', 403);
      const existing = state.organizationProfiles.findIndex(item => item.id === actor.id);
      const record = { id: actor.id, ...profile };
      if (existing < 0) state.organizationProfiles.push(record); else state.organizationProfiles[existing] = record;
      return record;
    });
  }
}
