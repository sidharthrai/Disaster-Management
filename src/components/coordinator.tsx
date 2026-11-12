'use client';
import { localizedRequestTitle } from '@/lib/request-presentation';
import { useLocale } from './locale-context';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { areas, categories, isActive } from '@/domain/model';
import { coordinatorMetrics, coordinatorPresets, filterCoordinatorRequests } from '@/lib/coordinator-overview';
import { useNetwork } from './network-context';
import { Badge, Button, Empty, PageHeading, dateLabel } from './ui';

const presets = coordinatorPresets;

export function Coordinator() {
  const { t, locale } = useLocale();
  const { state, command, busy } = useNetwork();
  const [preset, setPreset] = useState<(typeof presets)[number]>('All');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('');
  const [area, setArea] = useState('');
  const [assignee, setAssignee] = useState('');
  const [flag, setFlag] = useState('');
  const [helper, setHelper] = useState('');
  const [thresholds, setThresholds] = useState(state.settings.followUp);
  const [followUpError, setFollowUpError] = useState('');
  const [event, setEvent] = useState<'Flood' | 'Wildfire' | 'Storm' | 'Earthquake'>('Flood');
  if (state.actor.role !== 'coordinator') return <><PageHeading eyebrow={t("COORDINATOR")} title={t("Coordinator access")} description={t("This workspace is available to coordinators.")}/><div className="notice-box">{t("A coordinator account is required to review the queue.")}</div></>;
  const coordinators = state.users.filter(u => u.role === 'coordinator' && u.communityId === state.actor.communityId);
  const requests = filterCoordinatorRequests(state.requests, state.commitments, { preset, search, status, category, urgency, area, coordinator: assignee, helper, flag });
  const metrics = coordinatorMetrics(state);
  const helperIds = new Set(state.commitments.filter(isActive).map(c => c.helperId));
  const helpers = state.users.filter(u => helperIds.has(u.id));
  const flagKinds = Array.from(new Set(state.requests.flatMap(r => r.flags.map(f => f.kind))));
  async function saveThresholds(e: FormEvent) {
    e.preventDefault();
    setFollowUpError('');
    try { await command({ type: 'followUpSettings', input: thresholds }, t('Follow-up thresholds saved.')); }
    catch (error) { setFollowUpError(error instanceof Error ? error.message : 'Could not save thresholds. Please try again.'); }
  }
  async function evaluateFollowUps() {
    setFollowUpError('');
    try { await command({ type: 'evaluateFollowUps' }, t('Follow-up conditions evaluated.')); }
    catch (error) { setFollowUpError(error instanceof Error ? error.message : 'Could not evaluate follow-ups. Please try again.'); }
  }
  return <><PageHeading eyebrow={t("COORDINATOR WORKSPACE")} title={t("Care for the whole network.")} description={t("Review the queue, coordinate follow-up, and document decisions.")} action={<Link href="/emergency" className="button-secondary">{t("Emergency dashboard")}</Link>}/>
    <div className="metrics-strip"><div><strong>{metrics.openRequests}</strong><span>{t("Open requests")}</span></div><div><strong>{metrics.openNeedsWithoutHelper}</strong><span>{t("Open needs without an active helper")}</span></div><div><strong>{metrics.awaitingConfirmation}</strong><span>{t("Awaiting confirmation")}</span></div><div><strong>{metrics.urgentRequests}</strong><span>{t("Urgent or critical")}</span></div><div><strong>{metrics.reviewNeeded}</strong><span>{t("Flagged for review")}</span></div><div><strong>{metrics.activeHelpers}</strong><span>{t("Active helpers")}</span></div><div><strong>{state.metrics.needsAttention}</strong><span>{t("Need attention")}</span></div><div><strong>{state.reports.filter(r => !r.resolved).length}</strong><span>{t("Reports to review")}</span></div></div>
    <section className="block-section"><div className="section-heading"><div><h2>{t("Request queue")}</h2><p>{t("Combine filters to narrow the queue. Flags call for follow-up; they do not confirm an outcome.")}</p></div><strong>{requests.length} {t("shown")}</strong></div>
      <div className="button-row queue-presets" aria-label={t("Queue presets")}>{presets.map(p => <button className={preset === p ? 'button-primary' : 'button-secondary'} aria-pressed={preset === p} onClick={() => setPreset(p)} key={p}>{t(p)}</button>)}</div>
      <div className="filter-grid"><label className="field">{t("Search")}<input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("Title, summary, or case ID")}/></label><label className="field">{t("Status")}<select value={status} onChange={e => setStatus(e.target.value)}><option value="">{t("All statuses")}</option>{['Open', 'Connected', 'In progress', 'Awaiting confirmation', 'Resolved', 'Closed'].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label><label className="field">{t("Category")}<select value={category} onChange={e => setCategory(e.target.value)}><option value="">{t("All categories")}</option>{categories.map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label><label className="field">{t("Urgency")}<select value={urgency} onChange={e => setUrgency(e.target.value)}><option value="">{t("All urgency")}</option>{['Routine', 'Time sensitive', 'Urgent', 'Critical review'].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label><label className="field">{t("Neighborhood")}<select value={area} onChange={e => setArea(e.target.value)}><option value="">{t("All areas")}</option>{areas.map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label><label className="field">{t("Coordinator")}<select value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">{t("All coordinators")}</option><option value="unassigned">{t("No coordinator owner")}</option>{coordinators.map(u => <option value={u.id} key={u.id}>{u.name}</option>)}</select></label><label className="field">{t("Active helper")}<select value={helper} onChange={e => setHelper(e.target.value)}><option value="">{t("All active helpers")}</option>{helpers.map(u => <option value={u.id} key={u.id}>{u.name}</option>)}</select></label><label className="field">{t("Follow-up flag")}<select value={flag} onChange={e => setFlag(e.target.value)}><option value="">{t("All cases")}</option><option value="any">{t("Any active flag")}</option>{flagKinds.map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label></div>
      <div className="list">{requests.map(r => <article className="list-row" key={r.id}><div><h3>{localizedRequestTitle(r, t)} <Badge>{t(r.status)}</Badge> {r.restricted && <Badge tone="warning">{t("Private")}</Badge>} {r.escalated && <Badge tone="warning">{t("Escalated")}</Badge>}</h3><p>{r.area} · {t(r.urgency)} · {coordinators.find(u => u.id === r.assignedCoordinatorId)?.name ?? t('No coordinator owner')}</p><p>{r.flags.map(f => t(f.description)).join(' · ') || t('No active follow-up flags')} {t("· Created")} {dateLabel(r.createdAt, locale)}</p></div><Link className="text-link" href={`/requests/${r.id}`}>{t("Review case →")}</Link></article>)}</div>{!requests.length && <Empty title={t("No requests in this view")}>{t("Adjust the filters to see more cases.")}</Empty>}</section>
    {state.emergencyDashboard && <section className="block-section"><h2>{t("Resource availability")}</h2><p>{state.emergencyDashboard.resources.total} {t("listings ·")} {state.emergencyDashboard.resources.ready} {t("generally available ·")} {state.emergencyDashboard.resources.total - state.emergencyDashboard.resources.ready} {t("unavailable")}</p><p>{t("Availability considers capacity, partner eligibility, recent updates, and incident readiness when applicable. Matching also depends on the request.")}</p><Link className="text-link" href="/resources">{t("View resource catalog →")}</Link></section>}
    <section className="block-section"><h2>{t("Follow-up thresholds")}</h2><p>{t("Hours before a condition is flagged. Changing a threshold never confirms help.")}</p><form onSubmit={saveThresholds} className="filter-grid">{Object.entries(thresholds).map(([key, value]) => <label className="field" key={key}>{t(({unassignedHours:'Open need without active helper', responseHours:'Awaiting response', confirmationHours:'Awaiting confirmation', acceptedIdleHours:'Accepted but idle', urgentReviewHours:'Urgent review'} as Record<string,string>)[key] ?? key)}<input type="number" min="1" max="720" required value={value} onChange={e => setThresholds({ ...thresholds, [key]: Number(e.target.value) })}/></label>)}<Button disabled={busy}>{t("Save thresholds")}</Button></form>{followUpError && <p role="alert" className="field-error">{t(followUpError)}</p>}<div className="button-row"><Button secondary disabled={busy} onClick={() => void evaluateFollowUps()}>{t("Evaluate follow-ups now")}</Button></div></section>
    <section className="block-section"><h2>{t("Simulated incident")}</h2><p>{t("Existing offers and resources must reconfirm readiness. This does not dispatch help.")}</p><div className="button-row"><select aria-label={t("Incident type")} value={event} onChange={e => { const value = e.target.value; if (value === 'Flood' || value === 'Wildfire' || value === 'Storm' || value === 'Earthquake') setEvent(value); }}><option value="Flood">{t("Flood")}</option><option value="Wildfire">{t("Wildfire")}</option><option value="Storm">{t("Storm")}</option><option value="Earthquake">{t("Earthquake")}</option></select><Button disabled={busy} onClick={() => void command({ type: 'emergency', event }).catch(() => {})}>{t("Activate simulation")}</Button>{state.settings.emergency && <Button secondary disabled={busy} onClick={() => void command({ type: 'emergency', event: null }).catch(() => {})}>{t("Return to everyday mode")}</Button>}</div></section>
    <section className="block-section"><h2>{t("Community reports")}</h2>{state.reports.filter(r => !r.resolved).map(r => <article className="list-row" key={r.id}><div><Link className="text-link" href={`/requests/${r.requestId}`}>{t("View reported request →")}</Link><p>{r.reason}</p></div><div className="button-row"><Button secondary disabled={busy} onClick={() => void command({ type: 'moderate', id: r.id, hide: false }).catch(() => {})}>{t("Mark reviewed")}</Button><Button secondary disabled={busy} onClick={() => void command({ type: 'moderate', id: r.id, hide: true }).catch(() => {})}>{t("Restrict for review")}</Button></div></article>)}{!state.reports.some(r => !r.resolved) && <p>{t("No reports awaiting review.")}</p>}</section></>;
}
