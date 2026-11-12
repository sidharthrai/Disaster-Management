'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { NeighborhoodsProjection } from '@/domain/neighborhoods';
import { illustrativeAreaPositions, mapCenter } from '@/lib/map-data';
import { useLocale } from './locale-context';

type AreaSummary = NeighborhoodsProjection['areas'][number];
type Area = AreaSummary['area'];

type Props = {
  areas: AreaSummary[];
  selected: Area;
  onSelect: (area: Area) => void;
};

export function GeographicMap({ areas, selected, onSelect }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    let cancelled = false;
    let map: import('leaflet').Map | undefined;
    void import('leaflet').then(L => {
      if (cancelled || !element.current) return;
      map = L.map(element.current, { scrollWheelZoom: false }).setView([...mapCenter], 12);
      mapRef.current = map;
      const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      });
      tiles.on('tileerror', () => { if (!cancelled) setUnavailable(true); });
      tiles.addTo(map);
      setReady(true);
    }).catch(() => { if (!cancelled) setUnavailable(true); });
    return () => { cancelled = true; mapRef.current = null; map?.remove(); };
  }, []);

  useEffect(() => {
    if (!ready || !element.current) return;
    for (const { selector, label } of [
      { selector: '.leaflet-control-zoom-in', label: t('Zoom in') },
      { selector: '.leaflet-control-zoom-out', label: t('Zoom out') },
    ]) {
      const button = element.current.querySelector<HTMLElement>(selector);
      if (button) {
        button.title = label;
        button.setAttribute('aria-label', label);
      }
    }
  }, [ready, t]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    let cancelled = false;
    let markers: import('leaflet').LayerGroup | undefined;
    const map = mapRef.current;
    void import('leaflet').then(L => {
      if (cancelled) return;
      markers = L.layerGroup().addTo(map);
      for (const area of areas) {
        const label = document.createElement('span');
        label.textContent = `${area.area} · ${area.requests.length} ${t('open requests')} · ${area.activeOffers} ${t('active offers')}`;
        L.circleMarker([...illustrativeAreaPositions[area.area]], {
          radius: area.area === selected ? 12 : 9,
          weight: area.area === selected ? 4 : 2,
          color: 'var(--accent)',
          fillColor: 'var(--bg)',
          fillOpacity: 0.9,
        }).bindTooltip(label).on('click', () => onSelect(area.area)).addTo(markers);
      }
    });
    return () => { cancelled = true; markers?.remove(); };
  }, [areas, selected, onSelect, ready, t]);

  return <div className="geo-map">
    <div ref={element} className="geo-map__canvas" style={{ minHeight: 320 }} aria-label={t('Interactive illustrative map of fictional areas')} />
    {unavailable && <p className="geo-map__status" role="status">{t('Map tiles could not be loaded. Use the area buttons below to explore the same counts.')}</p>}
    <p className="geo-map__attribution">{t('Map tiles from OpenStreetMap. The area markers are illustrative only.')}</p>
  </div>;
}
