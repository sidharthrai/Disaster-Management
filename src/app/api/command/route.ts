import { CommandSchema } from '@/domain/commands';
import { requireCondition } from '@/domain/model';
import { seedState } from '@/domain/seed';
import { network, repository } from '@/server/services';
import { verifyCreatePreview } from '@/server/intake-preview';
import { currentIdentity } from '@/server/session';
import { boundedBody, sameOrigin, errorResponse, privateHeaders } from '@/server/http';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    sameOrigin(request); const command = CommandSchema.parse(await boundedBody(request)); const actor = await currentIdentity(); const service = network();
    let id: string | undefined;
    switch (command.type) {
      case 'createRequest': id = service.createRequest(actor, command.input, verifyCreatePreview(actor, command.input)); break;
      case 'createOffer': id = service.createOffer(actor, command.input); break;
      case 'propose': id = service.propose(actor, command.requestId, command.needId, command.offerId, command.resourceId); break;
      case 'respond': service.respond(actor, command.id, command.accept); break;
      case 'progress': service.progress(actor, command.id, command.action); break;
      case 'message': service.message(actor, command.requestId, command.commitmentId, command.text); break;
      case 'review': service.review(actor, command.requestId); break;
      case 'close': service.closeRequest(actor, command.requestId, command.outcome, command.reason); break;
      case 'emergency': service.setEmergency(actor, command.event); break;
      case 'offer': service.setOffer(actor, command.id, command.active, command.ready); break;
      case 'resource': service.setResource(actor, command.id, command.capacity, command.active, command.ready); break;
      case 'clock': service.advanceClock(actor, command.hours); break;
      case 'report': service.report(actor, command.requestId, command.reason); break;
      case 'moderate': service.moderate(actor, command.id, command.hide); break;
      case 'reset': requireCondition(service.snapshot(actor).actor.role === 'coordinator', 'Only a coordinator can reset the demo.', 403); repository().replace(seedState()); break;
      default: { const exhaustive: never = command; throw new Error(String(exhaustive)); }
    }
    return Response.json({ ok: true, id }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
