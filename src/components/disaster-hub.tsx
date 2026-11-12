'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Buildings, CheckCircle, Clock, HandHeart, ListChecks, LockSimple, Package, ShieldCheck, Siren, UsersThree, WarningCircle } from '@phosphor-icons/react';
import { orderCommunityRequests } from '@/lib/incident-actions';
import { localizedRequestTitle } from '@/lib/request-presentation';
import { SettingsSchema } from '@/domain/model';
import { useNetwork } from './network-context';
import { useLocale } from './locale-context';
import { dateLabel } from './ui';
import { DisasterPeople } from './disaster-people';
import { DisasterSupport } from './disaster-support';
import { IntakeForm } from './intake-form';
import styles from './disaster-hub.module.css';

function IncidentControls() {
  const { state, busy, command } = useNetwork();
  const { t } = useLocale();
  const [event, setEvent] = useState('Flood');
  const [error, setError] = useState('');
  const incident = state.settings.emergency;
  async function changeIncident(type: NonNullable<typeof incident>['type'] | null) {
    setError('');
    try { await command({ type: 'emergency', event: type }, t(type ? 'Simulation activated. Reconfirm offer and resource readiness.' : 'Simulation ended. Existing requests remain tracked.')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update the incident.'); }
  }
  function activate(e: FormEvent) {
    e.preventDefault();
    void changeIncident(SettingsSchema.shape.emergency.unwrap().shape.type.parse(event));
  }
  if (state.actor.role !== 'coordinator') return <p className={styles.controlNote}><LockSimple size={15} aria-hidden="true" />{t('Incident controls are available to community coordinators.')}</p>;
  if (state.actor.communityId !== 'riverton') return <p className={styles.controlNote}>{t('Incident simulation controls are available in the Riverton workspace.')}</p>;
  return <details className={styles.controls}>
    <summary>{t('Incident controls')} <ShieldCheck size={16} aria-hidden="true" /></summary>
    <p>{t('Simulation only. Starting an incident links new requests and requires offers and resources to reconfirm readiness.')}</p>
    {incident ? <button className={styles.secondaryButton} disabled={busy} onClick={() => void changeIncident(null)}>{busy ? t('Saving…') : t('End simulation')}</button> : <form onSubmit={activate}>
      <label htmlFor="hub-incident-type">{t('Incident type')}</label>
      <div className={styles.controlFields}><select id="hub-incident-type" value={event} onChange={e => setEvent(e.target.value)}>{['Flood', 'Wildfire', 'Storm', 'Earthquake'].map(type => <option value={type} key={type}>{t(type)}</option>)}</select><button className={styles.secondaryButton} disabled={busy}>{busy ? t('Saving…') : t('Activate simulation')}</button></div>
    </form>}
    {error && <p className={styles.error} role="alert">{t(error)}</p>}
    <Link href="/emergency" className={styles.smallLink}>{t('Open incident dashboard')} <ArrowRight size={14} aria-hidden="true" /></Link>
  </details>;
}

function ResponseQueue({ highlightedId = '' }: { highlightedId?: string }) {
  const { state } = useNetwork();
  const { t, locale } = useLocale();
  const [scope, setScope] = useState<'network' | 'mine' | 'incident'>('network');
  const incident = state.settings.emergency;
  const effectiveScope = scope === 'incident' && !incident ? 'network' : scope;
  const active = state.requests.filter(request => !request.closure && request.status !== 'Resolved');
  const related = new Set(state.commitments.filter(connection => connection.helperId === state.actor.id && !['cancelled', 'rejected', 'confirmed'].includes(connection.status)).map(connection => connection.requestId));
  const requests = orderCommunityRequests(active.filter(request => effectiveScope === 'mine' ? request.requesterId === state.actor.id || related.has(request.id) : effectiveScope === 'incident' ? Boolean(incident && request.incidentId === incident.id) : true), true, state.settings.now);
  const visibleRequests = highlightedId && effectiveScope !== 'network' && requests.some(request => request.id === highlightedId) ? requests : highlightedId ? [...requests.filter(request => request.id === highlightedId), ...requests.filter(request => request.id !== highlightedId)] : requests;
  const queueHref = state.actor.role === 'coordinator' ? '/coordinator' : '/dashboard';
  return <section id="response-queue" className={styles.queue} aria-labelledby="response-queue-heading">
    <div className={styles.sectionHeading}><div><span className={styles.kicker}>{t('Needs & tasks')}</span><h2 id="response-queue-heading">{t('Move the next request forward.')}</h2></div><Link className={styles.smallLink} href={queueHref}>{t(state.actor.role === 'coordinator' ? 'Open coordinator queue' : 'Open community requests')} <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    <div className={styles.queueTools}><div className={styles.filters} aria-label={t('Request scope')}>{(['network', 'mine', 'incident'] as const).map(value => <button type="button" key={value} aria-pressed={effectiveScope === value} disabled={value === 'incident' && !incident} onClick={() => setScope(value)}>{t(value === 'network' ? 'Community' : value === 'mine' ? 'My tasks' : 'This incident')}</button>)}</div><span>{requests.length} {t('open requests')}</span></div>
    <p className={styles.queueNote}>{t('Ordered by urgency, overdue window, then age. Only requests you are allowed to see appear here.')}</p>
    {visibleRequests.length ? <div className={styles.requestList}>{visibleRequests.slice(0, 5).map(request => <Link key={request.id} href={`/requests/${encodeURIComponent(request.id)}`} className={`${styles.requestRow} ${request.id === highlightedId ? styles.newRequestRow : ''}`}>
      <span className={styles.requestMark}>{request.restricted ? <LockSimple size={19} aria-hidden="true" /> : <HandHeart size={19} aria-hidden="true" />}</span>
      <span className={styles.requestCopy}><strong>{localizedRequestTitle(request, t)}{request.id === highlightedId && <span className={styles.newRequestBadge}>{t('New')}</span>}</strong><span>{request.area} · {t(request.urgency)} · {t(request.status)}</span><small>{t('Window ends')} {dateLabel(request.windowEnd, locale)}{request.restricted ? ` · ${t('Private review')}` : ''}</small></span>
      <span className={styles.requestNext}>{t(request.requesterId === state.actor.id && request.status === 'Awaiting confirmation' ? 'Confirm received help' : state.actor.role === 'coordinator' ? 'Review request' : 'View next step')} <ArrowRight size={16} aria-hidden="true" /></span>
    </Link>)}</div> : <div className={styles.empty}><CheckCircle size={25} aria-hidden="true" /><div><strong>{t('No open requests in this view')}</strong><p>{t(effectiveScope === 'incident' ? 'New requests created during the active incident will appear here.' : effectiveScope === 'mine' ? 'Your requests and active helper connections will appear here.' : 'Create a request when support is needed.')}</p><Link className={styles.smallLink} href="/request">{t('Ask for help')} <ArrowRight size={14} aria-hidden="true" /></Link></div></div>}
  </section>;
}

export function DisasterHub() {
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState('');
  const { state } = useNetwork();
  const { t, locale } = useLocale();
  const incident = state.settings.emergency;
  const open = state.requests.filter(request => !request.closure && request.status !== 'Resolved');
  const awaiting = open.filter(request => request.status === 'Awaiting confirmation').length;
  const ownPending = state.actor.role === 'organization' ? state.resources.filter(resource => resource.ownerId === state.actor.id && incident && resource.readyForEvent !== incident.id).length : state.offers.filter(offer => offer.userId === state.actor.id && offer.active && incident && offer.readyForEvent !== incident.id).length;
  const readinessHref = state.actor.role === 'organization' ? '/resources' : '/activity';
  return <div className={styles.hub}>
    <header className={styles.intro}><div><div className="eyebrow">{t('Disaster management')}</div><h1>{t('Community response workspace')}</h1><p>{t('Report a missing person privately, ask for help, and coordinate the support that is available.')}</p></div><span className={styles.role}><ShieldCheck size={16} aria-hidden="true" />{t(state.actor.role === 'coordinator' ? 'Coordinator workspace' : state.actor.role === 'organization' ? 'Partner workspace' : 'Member workspace')}</span></header>
    <section className={styles.incident} aria-labelledby="incident-heading">
      <div className={styles.incidentMain}><span className={styles.incidentLabel}><span className={styles.statusDot} />{t(incident ? 'Simulation active' : 'Readiness mode')}</span><h2 id="incident-heading">{incident ? incident.name : t('No active incident simulation')}</h2><p>{incident ? <>{t(incident.type)} · {t('Started')} {dateLabel(incident.startedAt, locale)}. {t('New requests are linked to this incident.')}</> : t('People reports and community support remain available. A coordinator can activate a simulated incident.')}</p><div className={styles.incidentFacts}><span><ListChecks size={16} aria-hidden="true" /><strong>{open.length}</strong> {t('visible open requests')}</span><span><Clock size={16} aria-hidden="true" /><strong>{awaiting}</strong> {t('awaiting confirmation')}</span></div></div>
      <div className={styles.incidentAside}><span className={styles.asideLabel}>{t(state.settings.clockMode === 'demo' ? 'Synthetic local demo' : 'Community account workspace')}</span><p>{t('If anyone is in immediate danger, contact the appropriate local emergency services. This workspace does not dispatch help.')}</p><IncidentControls /></div>
    </section>
    <nav className={styles.actionGrid} aria-label={t('Disaster response actions')}>
      <a href="#people" className={`${styles.action} ${styles.peopleAction}`}><span className={styles.actionIcon}><UsersThree size={25} weight="duotone" aria-hidden="true" /></span><span><span className={styles.kicker}>{t('Find & check in')}</span><strong>{t('Missing people & safe check-ins')}</strong><small>{t('Report privately, share a check-in, or send information to help.')}</small></span><ArrowRight size={21} aria-hidden="true" /></a>
      <button type="button" onClick={() => { setUrgentOpen(true); setCreatedRequestId(''); }} className={`${styles.action} ${styles.actionButton}`} aria-expanded={urgentOpen}><span className={styles.actionIcon}><Siren size={25} weight="duotone" aria-hidden="true" /></span><span><span className={styles.kicker}>{t('Ask for support')}</span><strong>{t('Request urgent help')}</strong><small>{t('Describe the need, review details, and choose a time window.')}</small></span><ArrowRight size={21} aria-hidden="true" /></button>
      <a href="#support" className={styles.action}><span className={styles.actionIcon}><Buildings size={25} weight="duotone" aria-hidden="true" /></span><span><span className={styles.kicker}>{t('Shelter & transport')}</span><strong>{t('Find available support')}</strong><small>{t('Check capacity and readiness, then request suitable help.')}</small></span><ArrowRight size={21} aria-hidden="true" /></a>
      <a href="#response-queue" className={styles.action}><span className={styles.actionIcon}><ListChecks size={25} weight="duotone" aria-hidden="true" /></span><span><span className={styles.kicker}>{t('Needs & tasks')}</span><strong>{t('View the response queue')}</strong><small>{t('Follow open needs, active connections, and confirmations.')}</small></span><ArrowRight size={21} aria-hidden="true" /></a>
    </nav>
    {urgentOpen && <section className={styles.urgentPanel} aria-labelledby="urgent-intake-heading"><div className={styles.urgentPanelHead}><div><span className={styles.kicker}>{t('Ask for support')}</span><h2 id="urgent-intake-heading">{createdRequestId ? t('Request created') : t('Request urgent help')}</h2></div><button type="button" className={styles.secondaryButton} onClick={() => setUrgentOpen(false)}>{t('Close')}</button></div>{createdRequestId ? <div className={styles.urgentReceipt} role="status"><CheckCircle size={22} aria-hidden="true" /><p>{t('Request added to response board.')}</p><a className={styles.smallLink} href="#response-queue" onClick={() => setUrgentOpen(false)}>{t('See on board')} <ArrowRight size={15} aria-hidden="true" /></a><Link href={`/requests/${encodeURIComponent(createdRequestId)}`} className={styles.smallLink}>{t('View request')} <ArrowRight size={15} aria-hidden="true" /></Link></div> : <IntakeForm key="urgent-intake" embedded initialUrgency="Urgent" onCreated={id => setCreatedRequestId(id)} />}</section>}
    {incident && <div className={styles.readiness}><WarningCircle size={20} aria-hidden="true" /><div><strong>{t('Readiness must be reconfirmed for this incident.')}</strong><span>{ownPending ? <>{ownPending} {t(state.actor.role === 'organization' ? 'of your listings still need a readiness update.' : 'of your active offers still need a readiness update.')}</> : t('Review your current availability before agreeing to help.')}</span></div><Link href={readinessHref}>{t(state.actor.role === 'organization' ? 'Manage resources' : 'Review my availability')} <ArrowRight size={16} aria-hidden="true" /></Link></div>}
    <DisasterPeople />
    <DisasterSupport />
    <ResponseQueue highlightedId={createdRequestId} />
    <section className={styles.moreTools} aria-labelledby="more-tools-heading"><div><span className={styles.kicker}>{t('More response tools')}</span><h2 id="more-tools-heading">{t('Keep the work connected.')}</h2></div><div className={styles.toolLinks}><Link href="/donations"><Package size={20} aria-hidden="true" /><span><strong>{t('Supplies & donations')}</strong><small>{t('Track supply requests and contributions.')}</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/activity"><HandHeart size={20} aria-hidden="true" /><span><strong>{t('My activity')}</strong><small>{t('Respond to connections and confirm received help.')}</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link><Link href="/resources"><Buildings size={20} aria-hidden="true" /><span><strong>{t('Resource catalog')}</strong><small>{t('Browse all partner services and availability.')}</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>{state.actor.role === 'coordinator' && <Link href="/emergency"><ShieldCheck size={20} aria-hidden="true" /><span><strong>{t('Incident dashboard')}</strong><small>{t('Review restricted cases and incident-wide readiness.')}</small></span><ArrowUpRight size={17} aria-hidden="true" /></Link>}</div></section>
  </div>;
}
