import type { Extraction } from '../domain/intake';

export function reviewedInitialUrgency(extraction: Pick<Extraction, 'urgency' | 'safetyFlags'>, requested: string | null): Extraction['urgency'] {
  if (extraction.safetyFlags.length || extraction.urgency === 'Critical review') return 'Critical review';
  return requested === 'Urgent' ? 'Urgent' : extraction.urgency;
}
