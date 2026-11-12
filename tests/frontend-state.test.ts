import { describe, expect, it } from 'vitest';
import { correctionFields, correctionWindow, localDate } from '../src/lib/correction-dates';

describe('coordinator correction window', () => {
  const start = '2026-11-11T12:34:56.789Z';
  const end = '2026-11-11T15:45:23.456Z';
  it('preserves precise stored timestamps when neither control was edited', () => {
    expect(correctionWindow('2026-11-11T12:34', '2026-11-11T15:45', start, end, false, false)).toEqual({ windowStart: start, windowEnd: end });
  });
  it('serializes only the changed control and retains the other exact instant', () => {
    const changed = '2026-11-10T13:00';
    expect(correctionWindow(changed, '', start, end, true, false)).toEqual({ windowStart: new Date(changed).toISOString(), windowEnd: end });
  });
  it('rejects invalid or reversed windows, including precise untouched instants', () => {
    expect(correctionWindow('', '', end, start, false, false)).toBeNull();
    expect(correctionWindow('invalid', '', start, end, true, false)).toBeNull();
  });
});


describe('correction drafts across request refreshes', () => {
  const original = {
    needs: [{ id: 'one', category: 'Groceries' as const, status: 'open' as const }],
    area: 'Riverside' as const, urgency: 'Routine' as const,
    windowStart: '2026-11-11T12:34:56.789Z', windowEnd: '2026-11-11T15:45:23.456Z',
  };
  const refreshed = {
    ...original, needs: [{ id: 'two', category: 'Transport' as const, status: 'open' as const }],
    area: 'Oakridge' as const, windowStart: '2026-11-12T10:01:02.123Z', windowEnd: '2026-11-12T14:03:04.567Z',
  };
  it('merges a local urgency edit with the latest external fields and exact timestamps', () => {
    const fields = correctionFields(refreshed, { urgency: 'Urgent' });
    expect(fields).toEqual({ categories: ['Transport'], area: 'Oakridge', urgency: 'Urgent', start: localDate(refreshed.windowStart), end: localDate(refreshed.windowEnd), window: { windowStart: refreshed.windowStart, windowEnd: refreshed.windowEnd } });
    expect(correctionFields(original, {}).start).not.toEqual(fields.start);
  });
  it('keeps consciously edited fields and serializes only the edited time', () => {
    const start = localDate(refreshed.windowStart);
    const fields = correctionFields(refreshed, { categories: ['Supplies'], area: 'Maple Grove', start });
    expect(fields.categories).toEqual(['Supplies']);
    expect(fields.area).toBe('Maple Grove');
    expect(fields.window).toEqual({ windowStart: new Date(start).toISOString(), windowEnd: refreshed.windowEnd });
  });
});
