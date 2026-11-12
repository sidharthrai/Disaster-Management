'use client';
import { useLocale } from './locale-context';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { areas } from '@/domain/model';
import { DonationBoardSchema, type DonationBoard } from '@/domain/donations';
import { useNetwork } from './network-context';
import { Badge, Empty, PageHeading, dateLabel } from './ui';

type LoadState = { identity: string; revision: number; board: DonationBoard; error: null } | { identity: string; revision: number; board: null; error: string };
export function Donations() { const { t, locale } = useLocale();
  const { state, revision, identityChanging } = useNetwork();
  const identity = state.actor.id;
  const [loaded, setLoaded] = useState<LoadState | null>(null);
  const [category, setCategory] = useState(''); const [area, setArea] = useState('');
  useEffect(() => {
    if (identityChanging) return;
    const controller = new AbortController();
    fetch('/api/donations', { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Could not load the board.'); return DonationBoardSchema.parse(await response.json()); })
      .then(board => { if (!controller.signal.aborted) setLoaded({ identity, revision, board, error: null }); })
      .catch(() => { if (!controller.signal.aborted) setLoaded({ identity, revision, board: null, error: 'Could not load the board. Please try again.' }); });
    return () => controller.abort();
  }, [identity, identityChanging, revision]);
  const current = !identityChanging && loaded?.identity === identity && loaded.revision === revision ? loaded : null;
  const filter = (item: { category: string; area: string }) => (!category || item.category === category) && (!area || item.area === area);
  const resources = current?.board?.resources.filter(filter) ?? [];
  const offers = current?.board?.offers.filter(filter) ?? [];
  const requestLink = (item: { category: string; area: string }) => `/request?${new URLSearchParams({ category: item.category, area: item.area })}`;
  const offerLink = `/offer?${new URLSearchParams({ category: category || 'Supplies', area: area || state.actor.area })}`;
  return <section><PageHeading eyebrow={t("COMMUNITY RESOURCES")} title={t("Groceries and supplies")} description={t("Explore local offers and organization resources, then use the existing request process to connect.")} />
    <p className="notice-box">{t("Resource units belong to each listing and are not guaranteed stock. Neighbors agree privately through the existing request process, and the requester confirms the outcome.")}</p>
    <div className="button-row mt-5"><Link className="text-link" href={offerLink}>{t("Offer supplies →")}</Link>{state.actor.role === 'organization' && <Link className="text-link" href="/resources">{t("Manage organization resources →")}</Link>}</div>
    <div className="grid gap-5 sm:grid-cols-2 mt-6"><div className="field"><label htmlFor="donation-category">{t("Category")}</label><select id="donation-category" value={category} onChange={e => setCategory(e.target.value)}><option value="">{t("All categories")}</option><option value="Groceries">{t("Groceries")}</option><option value="Supplies">{t("Supplies")}</option></select></div><div className="field"><label htmlFor="donation-area">{t("Neighborhood")}</label><select id="donation-area" value={area} onChange={e => setArea(e.target.value)}><option value="">{t("All neighborhoods")}</option>{areas.map(a => <option key={a} value={a}>{t(a)}</option>)}</select></div></div>
    {!current ? <p role="status" className="mt-6">{t("Loading supplies board…")}</p> : current.error ? <p role="alert" className="inline-error mt-6">{t(current.error)}</p> : !resources.length && !offers.length ? <Empty title={t("No matching listings")}>{t("Try another category or neighborhood, or share an offer.")}</Empty> : <><section className="block-section"><h2>{t("Organization resources")}</h2>{resources.length ? <div className="list">{resources.map(item => <article className="list-row" key={item.id}><div><h3>{t(item.category)} · {item.area} <Badge tone="green">{t("Available")}</Badge></h3><p>{item.units} {t("resource units reported available · subject to confirmation")}</p><Link className="text-link" href={requestLink(item)}>{t("Request help →")}</Link></div></article>)}</div> : <p>{t("No matching organization resources.")}</p>}</section><section className="block-section"><h2>{t("Neighbor offers")}</h2>{offers.length ? <div className="list">{offers.map(item => <article className="list-row" key={`${item.id}:${t(item.category)}`}><div><h3>{t(item.category)} · {item.area}</h3><p>{t("Offer window:")} {dateLabel(item.startAt, locale)} {t("to")} {dateLabel(item.endAt, locale)}</p><Link className="text-link" href={requestLink(item)}>{t("Request help →")}</Link></div></article>)}</div> : <p>{t("No matching neighbor offers.")}</p>}</section></>}
  </section>;
}
