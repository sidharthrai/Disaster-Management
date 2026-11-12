import { describe, expect, it } from 'vitest';
import { reviewedInitialUrgency } from '../src/lib/intake-urgency';

describe('urgent-help intake entry', () => {
  it('prefills urgency only for the supported canonical urgent entry', () => {
    expect(reviewedInitialUrgency({ urgency: 'Routine', safetyFlags: [] }, 'Urgent')).toBe('Urgent');
    for (const requested of [null, 'Routine', 'Critical review', 'urgent']) expect(reviewedInitialUrgency({ urgency: 'Time sensitive', safetyFlags: [] }, requested)).toBe('Time sensitive');
  });
  it('preserves critical review for sensitive or already critical analysis', () => {
    expect(reviewedInitialUrgency({ urgency: 'Routine', safetyFlags: ['medical'] }, 'Urgent')).toBe('Critical review');
    expect(reviewedInitialUrgency({ urgency: 'Critical review', safetyFlags: [] }, 'Urgent')).toBe('Critical review');
  });
});
