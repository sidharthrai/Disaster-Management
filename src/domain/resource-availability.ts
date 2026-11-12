import type { Resource } from './model';

export function resourceIsFresh(resource: Resource, now: string): boolean {
  const age = Date.parse(now) - Date.parse(resource.verifiedAt);
  return Number.isFinite(age) && age >= 0 && age <= 24 * 3600000;
}
