import { describe, expect, it } from 'vitest';
import { areas } from '../src/domain/model';
import { illustrativeAreaPositions, mapCenter } from '../src/lib/map-data';

describe('illustrative map positions', () => {
  it('provides a distinct point for every fictional area in the Chicago demo extent', () => {
    expect(Object.keys(illustrativeAreaPositions).sort()).toEqual([...areas].sort());
    const positions = areas.map(area => illustrativeAreaPositions[area]);
    expect(new Set(positions.map(position => position.join(','))).size).toBe(areas.length);
    for (const [latitude, longitude] of positions) {
      expect(latitude).toBeGreaterThan(41.7);
      expect(latitude).toBeLessThan(42.1);
      expect(longitude).toBeGreaterThan(-88);
      expect(longitude).toBeLessThan(-87.5);
    }
    expect(mapCenter[0]).toBeGreaterThan(41.7);
  });
});

describe('neighborhood refresh state', () => {
  it('retains same-identity data after a failed refresh but never carries it to another identity', async () => {
    const { failedNeighborhoodLoad, visibleNeighborhoodLoad } = await import('../src/lib/map-data');
    const previous = { identity: 'alice', data: { areas: [], asOf: 'now' }, error: null };
    const failed = failedNeighborhoodLoad(previous, 'alice');
    expect(failed.data).toEqual(previous.data);
    expect(failed.error).not.toBeNull();
    expect(visibleNeighborhoodLoad(failed, 'alice', false)).toEqual(failed);
    expect(visibleNeighborhoodLoad(failed, 'alice', true)).toBeNull();
    expect(visibleNeighborhoodLoad(failed, 'bob', false)).toBeNull();
    expect(failedNeighborhoodLoad(previous, 'bob').data).toBeNull();
  });
});
