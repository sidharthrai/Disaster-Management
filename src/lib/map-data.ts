import type { z } from 'zod';
import type { AreaSchema } from '@/domain/model';

type Area = z.infer<typeof AreaSchema>;
type Coordinates = readonly [latitude: number, longitude: number];

// These positions are illustrative only; they do not represent actual Riverton locations.
export const illustrativeAreaPositions: Readonly<Record<Area, Coordinates>> = {
  Riverside: [41.895, -87.68],
  'Maple Grove': [41.925, -87.705],
  Oakridge: [41.875, -87.72],
  'Central Park': [41.883, -87.63],
  'River Street': [41.86, -87.66],
};

export const mapCenter: Coordinates = [41.89, -87.67];

export type NeighborhoodLoad = {
  identity: string;
  data: import('@/domain/neighborhoods').NeighborhoodsProjection | null;
  error: string | null;
};

export function failedNeighborhoodLoad(previous: NeighborhoodLoad | null, identity: string): NeighborhoodLoad {
  return {
    identity,
    data: previous?.identity === identity ? previous.data : null,
    error: 'Neighborhoods could not be loaded. Please try again.',
  };
}

export function visibleNeighborhoodLoad(loaded: NeighborhoodLoad | null, identity: string, identityChanging: boolean): NeighborhoodLoad | null {
  return !identityChanging && loaded?.identity === identity ? loaded : null;
}
