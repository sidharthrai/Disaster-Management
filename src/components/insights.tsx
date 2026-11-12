'use client';
import { useLocale } from './locale-context';

import { useEffect, useState } from 'react';
import { InsightsResponseSchema, type Insights as InsightsData } from '@/domain/analytics';
import { useNetwork } from './network-context';
import { Empty, PageHeading, dateLabel } from './ui';

type LoadState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'loaded'; actorId: string; data: InsightsData };

export function Insights() {
  const { t, locale } = useLocale();
  const { state, revision, identityChanging } = useNetwork();
  const actorId = state.actor.id;
  const coordinator = state.actor.role === 'coordinator';
  const [result, setResult] = useState<LoadState>({ kind: 'loading' });
  useEffect(() => {
    if (!coordinator || identityChanging) return;
    const controller = new AbortController();
    setResult({ kind: 'loading' });
    fetch('/api/insights', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Insights could not be loaded. Please try refreshing the page.');
      const parsed = InsightsResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('Insights returned an invalid response. Please try again.');
      return parsed.data;
    }).then(data => { if (!controller.signal.aborted) setResult({ kind: 'loaded', actorId, data }); }).catch(error => {
      if (!controller.signal.aborted) setResult({ kind: 'error', message: error instanceof Error ? error.message : 'Insights could not be loaded.' });
    });
    return () => controller.abort();
  }, [actorId, coordinator, identityChanging, revision]);
  if (!coordinator) return <><PageHeading eyebrow={t("COORDINATOR")} title={t("Coordinator access")} description={t("This workspace is available to coordinators.")}/><div className="notice-box">{t("A coordinator account is required to view insights.")}</div></>;
  const heading = <PageHeading eyebrow={t("COORDINATOR WORKSPACE")} title={t("Community insights")} description={t("A read-only picture of recorded activity in your community.")}/>;
  if (identityChanging || result.kind === 'loading' || (result.kind === 'loaded' && result.actorId !== actorId)) return <>{heading}<p role="status">{t("Loading insights…")}</p></>;
  if (result.kind === 'error') return <>{heading}<p role="alert" className="field-error">{t(result.message)}</p></>;
  const data = result.data;
  return <>{heading}<p>{t("As of")} {dateLabel(data.asOf, locale)} · {data.clockMode === 'demo' ? t("Synthetic demo clock and data") : t("Application clock")}.</p>
    <div className="metrics-strip"><div><strong>{data.totalRequests}</strong><span>{t("Submitted requests")}</span></div><div><strong>{data.everAcceptedRequests}</strong><span>{t("Requests ever accepted")}</span></div><div><strong>{data.activeCommitments}</strong><span>{t("Active commitments")}</span></div><div><strong>{data.overdueUnresolvedRequests}</strong><span>{t("Overdue unresolved requests")}</span></div></div>
    <section className="block-section"><div className="section-heading"><div><h2>{t("Recorded outcomes")}</h2><p>{t("Requester-confirmed needs and fully resolved requests are counted separately. Administrative closures are not confirmed outcomes.")}</p></div></div><div className="metrics-strip"><div><strong>{data.fullyResolvedRequests}</strong><span>{t("Fully resolved requests")}</span></div><div><strong>{data.confirmedNeeds}</strong><span>{t("Confirmed needs")}</span></div><div><strong>{data.firstAcceptance.medianHours === null ? '—' : `${Number(data.firstAcceptance.medianHours.toFixed(2))} h`}</strong><span>{t("Median to first acceptance")}</span></div></div><p>{t("Median uses")} {data.firstAcceptance.sampleCount} {t("requests;")} {data.firstAcceptance.invalidExcludedCount} {t("accepted requests were excluded for missing, invalid, or impossible timestamps.")}</p><p>{t("Volunteer participation:")} {data.participation.helpersWithAcceptedCommitments} {t("of")} {data.participation.communityMembers} {t("community members have ever been a helper on an accepted commitment. Organization helpers are excluded from both figures.")}</p></section>
    <section className="block-section"><div className="section-heading"><div><h2>{t("Resource capacity")}</h2><p>{t("Each row is a separate resource. Units are defined by that resource and cannot be added across rows. Eligibility is a general availability check; matching also depends on the request, location, timing and participants.")}</p></div></div>
      {data.resources.length ? <div className="list">{data.resources.map(resource => <article className="list-row" key={resource.id}><div><h3>{resource.name}</h3><p>{t(resource.category)} · {resource.area} · {t(resource.capacityMode)} {t("units")} {resource.synthetic ? t('· Synthetic owner') : !resource.ownerKnown ? t('· Owner unknown') : ''}</p><p>{resource.available} {t("available of")} {resource.capacity} {t("recorded ·")} {resource.reserved} {t("reserved · Updated")} {dateLabel(resource.updatedAt, locale)}</p><p>{resource.active ? t("Active") : t("Inactive")} · {resource.fresh ? t("Updated within 24 hours") : t("Stale or invalid update")} · {resource.incidentReady ? t("Incident readiness satisfied") : t("Incident readiness needed")} · {resource.qualified ? t("Owner eligibility satisfied") : t("Owner eligibility not satisfied")} · {resource.eligible ? t("Generally eligible") : t("Not currently eligible")}</p></div></article>)}</div> : <Empty title={t("No resources recorded")}>{t("No resources are recorded for this community.")}</Empty>}</section>
    {!data.totalRequests && <Empty title={t("No requests recorded")}>{t("Insights will reflect requests as they are recorded.")}</Empty>}</>;
}
