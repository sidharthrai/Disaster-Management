'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { areas, type AreaSchema } from '@/domain/model';
import { NeighborhoodsProjectionSchema } from '@/domain/neighborhoods';
import { failedNeighborhoodLoad, visibleNeighborhoodLoad, type NeighborhoodLoad } from '@/lib/map-data';
import { useNetwork } from './network-context';
import { useLocale } from './locale-context';
import { GeographicMap } from './geographic-map';
import { PageHeading } from './ui';
import type { z } from 'zod';

type Area = z.infer<typeof AreaSchema>;
export function Neighborhoods() {
  const { state, revision, identityChanging } = useNetwork();
  const { t } = useLocale();
  const identity = state.actor.id;
  const [selected, setSelected] = useState<Area>(areas[0]);
  const selectArea = useCallback((area: Area) => setSelected(area), []);
  const [loaded, setLoaded] = useState<NeighborhoodLoad | null>(null);
  useEffect(() => {
    if (identityChanging) return;
    const controller = new AbortController();
    fetch('/api/neighborhoods', { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Unable to load neighborhoods'); return NeighborhoodsProjectionSchema.parse(await response.json()); })
      .then(data => { if (!controller.signal.aborted) setLoaded({ identity, data, error: null }); })
      .catch(() => { if (!controller.signal.aborted) setLoaded(previous => failedNeighborhoodLoad(previous, identity)); });
    return () => controller.abort();
  }, [identity, identityChanging, revision]);
  const current = visibleNeighborhoodLoad(loaded, identity, identityChanging);
  const area = current?.data?.areas.find(item => item.area === selected);
  return <section>
    <PageHeading eyebrow={t('YOUR COMMUNITY')} title={t('Neighborhood overview')} description={t('Explore community activity across five fictional areas.')} />
    <p>{t('Riverton and its areas are fictional. Markers are illustrative positions on a Chicago map, not real incident locations, GPS, routes, or shelters. There is no live hazard feed.')}</p>
    {!current ? <p role="status">{t('Loading neighborhoods…')}</p> : !current.data ? <p role="alert">{t(current.error ?? 'Neighborhoods could not be loaded. Please try again.')}</p> : <>
      {current.error && <p role="status">{t('The latest refresh failed. Showing the last available neighborhood data.')}</p>}
      <GeographicMap areas={current.data.areas} selected={selected} onSelect={selectArea} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label={t('Choose a fictional area')}>
        {current.data.areas.map(item => <button type="button" className={item.area === selected ? 'button-primary' : 'button-secondary'} aria-pressed={item.area === selected} onClick={() => selectArea(item.area)} key={item.area}>{item.area}<br /><span>{item.requests.length} {t('open requests')} · {item.activeOffers} {t('active offers')}</span></button>)}
      </div>
      {area && <div className="mt-6" aria-live="polite">
        <h2>{area.area}</h2>
        <p>{area.requests.length} {t('open requests')} · {area.activeOffers} {t('active offers')}</p>
        <p>{area.availableResources} {t('resource listings currently available')} · {area.unavailableResources} {t('stale or unavailable listings')}</p>
        <p>{t('Availability depends on freshness, verified ownership, remaining capacity and current incident readiness. Listings are not a count of people or a guarantee of stock.')}</p>
        <Link className="text-link" href="/resources">{t('Browse resources →')}</Link>
        <h3>{t('Open requests')}</h3>
        {area.requests.length ? <ul>{area.requests.map(request => <li key={request.id}><Link className="text-link" href={`/requests/${encodeURIComponent(request.id)}`}>{request.categories.map(t).join(', ') || t('Community')} {t('request →')}</Link></li>)}</ul> : <p>{t('No open requests in this area.')}</p>}
      </div>}
    </>}
  </section>;
}
