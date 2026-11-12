import { z } from 'zod';
import { AreaSchema, CategorySchema, OrganizationApplicationSchema, requireCondition } from './model';
import type { Repository } from './store';

const unique = <T>(values: T[]) => new Set(values).size === values.length;
export const ApplicationInputSchema = z.strictObject({
  description: z.string().trim().min(1).max(1000),
  services: z.array(CategorySchema).min(1).max(5).refine(unique),
  serviceAreas: z.array(AreaSchema).min(1).max(5).refine(unique),
}).refine(input => !input.services.includes('Medical') && !input.services.includes('Missing person'), 'Medical and missing-person services cannot be requested here.');
export const ApprovalCommandSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('apply'), input: ApplicationInputSchema }),
  z.strictObject({ action: z.literal('withdraw'), id: z.string().min(1).max(100) }),
  z.strictObject({ action: z.enum(['approve', 'decline', 'revoke']), id: z.string().min(1).max(100), reason: z.string().trim().min(1).max(1000) }),
]);
export const ApprovalListSchema = z.object({ applications: z.array(OrganizationApplicationSchema) });
export const ApprovalResponseSchema = z.object({ ok: z.literal(true) });
export type ApplicationInput = z.infer<typeof ApplicationInputSchema>;

export class OrganizationApprovalsService {
  constructor(private readonly repository: Repository) {}
  list(actorId: string) {
    const state = this.repository.read();
    const actor = state.users.find(user => user.id === actorId);
    requireCondition(actor, 'Sign in required.', 401);
    return { applications: state.organizationApplications.filter(item => item.communityId === actor.communityId && (actor.role === 'coordinator' || item.applicantId === actor.id)) };
  }
  execute(actorId: string, raw: unknown) {
    const command = ApprovalCommandSchema.parse(raw);
    return this.repository.transaction(state => {
      const actor = state.users.find(user => user.id === actorId);
      requireCondition(actor, 'Sign in required.', 401);
      const at = state.settings.now;
      if (command.action === 'apply') {
        requireCondition(actor.role === 'member' || (actor.role === 'organization' && !actor.verified), 'Only members and unverified organizations can apply.', 403);
        requireCondition(!state.organizationApplications.some(item => item.applicantId === actor.id && item.communityId === actor.communityId && item.status === 'pending'), 'An application is already pending.', 409);
        state.organizationApplications.push({ id: crypto.randomUUID(), communityId: actor.communityId, applicantId: actor.id, applicantName: actor.name, ...command.input, status: 'pending', submittedAt: at, history: [{ action: 'submitted', actorId: actor.id, at, reason: '' }] });
        return;
      }
      const application = state.organizationApplications.find(item => item.id === command.id && item.communityId === actor.communityId);
      requireCondition(application, 'Application not found.', 404);
      if (command.action === 'withdraw') {
        requireCondition(application.applicantId === actor.id, 'Only the applicant can withdraw.', 403);
        requireCondition(application.status === 'pending', 'Only pending applications can be withdrawn.', 409);
        application.status = 'withdrawn';
        application.history.push({ action: 'withdrawn', actorId: actor.id, at, reason: '' });
        return;
      }
      requireCondition(actor.role === 'coordinator' && actor.id !== application.applicantId, 'A different community coordinator must decide.', 403);
      const applicant = state.users.find(user => user.id === application.applicantId && user.communityId === application.communityId);
      requireCondition(applicant, 'Applicant not found.', 404);
      if (command.action === 'revoke') {
        requireCondition(application.status === 'approved' && applicant.role === 'organization' && applicant.verified, 'Only an active approval can be revoked.', 409);
        applicant.verified = false;
        application.status = 'revoked';
        application.history.push({ action: 'revoked', actorId: actor.id, at, reason: command.reason });
        return;
      }
      requireCondition(application.status === 'pending', 'Only pending applications can be decided.', 409);
      requireCondition(applicant.role === 'member' || (applicant.role === 'organization' && !applicant.verified), 'Applicant is no longer eligible.', 409);
      if (command.action === 'approve') requireCondition(!applicant.qualifiedCategories.some(category => category === 'Medical' || category === 'Missing person'), 'This account has a sensitive qualification and needs operator review before approval.', 409);
      if (command.action === 'approve') { applicant.role = 'organization'; applicant.verified = true; application.status = 'approved'; }
      else application.status = 'declined';
      application.history.push({ action: command.action === 'approve' ? 'approved' : 'declined', actorId: actor.id, at, reason: command.reason });
    });
  }
}
