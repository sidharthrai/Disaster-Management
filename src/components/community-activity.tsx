'use client';
import { useLocale } from './locale-context';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CommunityActivitySchema, type CommunityActivityItem } from '@/domain/activity';
import { useNetwork } from './network-context';
import { Badge, Empty, PageHeading, dateLabel } from './ui';

type LoadState = { identity: string; revision: number; items: CommunityActivityItem[]; error: null } | { identity: string; revision: number; items: null; error: string };
export function CommunityActivity({ compact = false }: { compact?: boolean }) { const { t, locale } = useLocale();
  const { state, revision, identityChanging } = useNetwork();
  const identity = state.actor.id;
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  useEffect(() => {
    if (identityChanging) return;
    const controller = new AbortController();
    fetch('/api/community/activity', { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Activity could not be loaded.'); return CommunityActivitySchema.parse(await response.json()); })
      .then(data => { if (!controller.signal.aborted) setLoaded({ identity, revision, items: data.items, error: null }); })
      .catch(() => { if (!controller.signal.aborted) setLoaded({ identity, revision, items: null, error: 'Activity could not be loaded. Please try again.' }); });
    return () => controller.abort();
  }, [identity, identityChanging, revision]);
  const current = !identityChanging && loaded?.identity === identity && loaded.revision === revision ? loaded : null;
  const items = current?.items && (compact ? current.items.slice(0, 5) : current.items);
  return <section>
    {!compact && <PageHeading eyebrow={t("YOUR COMMUNITY")} title={t("Community activity")} description={t("Recent requests and confirmed help in your community.")} />}
    {!current ? <p role="status">{t("Loading community activity…")}</p> : current.error ? <p role="alert">{t(current.error)}</p> : items?.length ? <div className="list">{items.map(item => <article className="list-row" key={item.id}><div><h3>{t(item.kind === 'posted' ? 'A request was posted' : 'Help was confirmed for a need')} <Badge tone="green">{t(item.kind === 'posted' ? 'Posted' : 'Confirmed help')}</Badge></h3><p>{item.categories.map(t).join(', ') || t('Community')} · {item.area} · {dateLabel(item.at, locale)}</p><Link className="text-link" href={`/requests/${encodeURIComponent(item.requestId)}`}>{t("View request →")}</Link></div></article>)}</div> : <Empty title={t("No community activity yet")}>{t("Recent requests and confirmed help will appear here.")}</Empty>}
  </section>;
}
