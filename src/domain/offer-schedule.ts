import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { AreaSchema, CategorySchema, OfferSchema, requireCondition } from './model';
import type { Repository } from './store';

const zone = 'America/Chicago';
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Enter a local date and time.');
export const OfferScheduleSchema = z.strictObject({
  description: z.string().trim().min(8).max(1000),
  affiliation: z.string().trim().max(120).transform(value => value || undefined).optional(),
  categories: z.array(CategorySchema).min(1).max(5).refine(values => new Set(values).size === values.length && !values.some(value => value === 'Medical' || value === 'Missing person'), 'Choose ordinary, distinct capabilities.'),
  areas: z.array(AreaSchema).min(1).max(5).refine(values => new Set(values).size === values.length, 'Choose distinct neighborhoods.'),
  startLocal: localDateTime, endLocal: localDateTime,
  weeks: z.number().int().min(1).max(4), confirmed: z.literal(true),
});
function addWeeks(local: string, weeks: number) {
  const date = new Date(`${local}:00.000Z`);
  requireCondition(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === local, 'Enter a valid local date and time.');
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 16);
}
function toInstant(local: string) {
  const instant = fromZonedTime(local, zone);
  requireCondition(Number.isFinite(instant.getTime()) && formatInTimeZone(instant, zone, "yyyy-MM-dd'T'HH:mm") === local, 'A selected local time does not exist in Chicago. Choose another time.');
  return instant;
}
export function previewOfferSchedule(input: unknown) {
  const parsed = OfferScheduleSchema.parse(input);
  return Array.from({ length: parsed.weeks }, (_, index) => {
    const startLocal = addWeeks(parsed.startLocal, index); const endLocal = addWeeks(parsed.endLocal, index);
    const start = toInstant(startLocal); const end = toInstant(endLocal);
    requireCondition(end.getTime() > start.getTime() && end.getTime() - start.getTime() <= 24 * 3600000, 'Each window must end after it starts and last no more than 24 hours.');
    return { startLocal, endLocal, startAt: start.toISOString(), endAt: end.toISOString() };
  });
}
export class OfferScheduleService {
  constructor(private readonly repository: Repository) {}
  create(actorId: string, input: unknown) {
    const parsed = OfferScheduleSchema.parse(input); const windows = previewOfferSchedule(parsed);
    return this.repository.transaction(state => {
      const actor = state.users.find(user => user.id === actorId); requireCondition(actor, 'Sign in required.', 401);
      const now = Date.parse(state.settings.now);
      requireCondition(Number.isFinite(now) && windows.every(window => Date.parse(window.startAt) > now), 'Every window must start in the future.');
      const offers = windows.flatMap(window => parsed.areas.map(area => OfferSchema.parse({ id: crypto.randomUUID(), userId: actor.id, communityId: actor.communityId, description: parsed.description, affiliation: parsed.affiliation, categories: parsed.categories, area, startAt: window.startAt, endAt: window.endAt, active: true, readyForEvent: null })));
      state.offers.unshift(...offers); return offers.map(offer => offer.id);
    });
  }
}
