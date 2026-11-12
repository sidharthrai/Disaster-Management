import type { Extraction } from '../domain/intake';

export function reviewedInitialUrgency(extraction: Pick<Extraction, 'urgency' | 'safetyFlags'>, requested: string | null): Extraction['urgency'] {
  if (extraction.safetyFlags.length || extraction.urgency === 'Critical review') return 'Critical review';
  return requested === 'Urgent' ? 'Urgent' : extraction.urgency;
}

export function applyReviewedUrgency(extraction: Pick<Extraction, 'urgency' | 'safetyFlags'>, reviewed: Extraction['urgency']): Extraction['urgency'] {
  return extraction.safetyFlags.length ? 'Critical review' : reviewed;
}
