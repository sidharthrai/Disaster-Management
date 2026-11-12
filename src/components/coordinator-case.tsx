'use client';
import { useLocale } from './locale-context';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { areas, categories, AreaSchema, UrgencySchema } from '@/domain/model';
import type { RequestDetail } from '@/domain/network';
import type { Command } from '@/domain/commands';
import { useNetwork } from './network-context';
import { Button, dateLabel } from './ui';
import { correctionFields, type CorrectionDraft } from '@/lib/correction-dates';

function useCaseAction() {
  const { command } = useNetwork();
  const [error, setError] = useState('');
  async function run(input: Command, success: string) {
    setError('');
    try {
      await command(input, success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this change. Please try again.');
      return false;
    }
  }
  return { error, run };
}

function ActionError({ message }: { message: string }) {
  const { t } = useLocale();
  return message ? <p role="alert" className="field-error">{t(message)}</p> : null;
}

function Ownership({ detail }: { detail: RequestDetail }) {
  const { t } = useLocale();
  const { state, busy } = useNetwork();
  const { error, run } = useCaseAction();
  const editVersion = useRef(0);
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const assigned = draft ?? detail.request.assignedCoordinatorId ?? '';
  useEffect(() => { if (saved !== null && (detail.request.assignedCoordinatorId ?? '') === saved) { setDraft(null); setSaved(null); } }, [detail.request.assignedCoordinatorId, saved]);
  const coordinators = state.users.filter(user => user.role === 'coordinator' && user.communityId === state.actor.communityId);
  return <section className="block-section">
    <h2>{t("Coordinator ownership")}</h2>
    <p>{t("Assignment records responsibility for review; it does not confirm help.")}</p>
    <div className="button-row">
      <label className="field">{t("Assigned coordinator")}<select value={assigned} onChange={event => { editVersion.current++; setDraft(event.target.value); setSaved(null); }}><option value="">{t("Unassigned")}</option>{coordinators.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <Button secondary disabled={busy} onClick={() => { const version = editVersion.current; void run({ type: 'assignCoordinator', requestId: detail.request.id, coordinatorId: assigned || null }, t('Coordinator assignment saved.')).then(success => { if (success && editVersion.current === version) setSaved(assigned); }); }}>{t("Save assignment")}</Button>
    </div>
    <ActionError message={t(error)}/>
  </section>;
}

function Correction({ detail }: { detail: RequestDetail }) {
  const { t } = useLocale();
  const { busy } = useNetwork();
  const { error, run } = useCaseAction();
  const request = detail.request;
  const editVersion = useRef(0);
  const [draft, setDraft] = useState<CorrectionDraft>({});
  const [saved, setSaved] = useState<ReturnType<typeof correctionFields> | null>(null);
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const { categories: selected, area, urgency, start, end, window } = correctionFields(request, draft);
  function edit(change: CorrectionDraft) { editVersion.current++; setDraft(current => ({ ...current, ...change })); setSaved(null); }
  useEffect(() => {
    if (!saved?.window) return;
    const categoriesMatch = saved.categories.length === request.needs.length && request.needs.every(need => saved.categories.includes(need.category));
    const expectedUrgency = request.restricted || saved.categories.some(category => category === 'Medical' || category === 'Missing person') ? 'Critical review' : saved.urgency;
    if (categoriesMatch && request.area === saved.area && request.urgency === expectedUrgency && request.windowStart === saved.window.windowStart && request.windowEnd === saved.window.windowEnd) {
      setDraft({}); setSaved(null);
    }
  }, [request, saved]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!window) {
      setValidationError('Choose a valid window with an end after its start.');
      return;
    }
    setValidationError('');
    const fields = correctionFields(request, draft);
    const version = editVersion.current;
    if (await run({ type: 'correctRequest', requestId: request.id, input: { categories: selected, area, urgency, ...window, note: reason } }, t('Case correction saved.')) && editVersion.current === version) { setReason(''); setSaved(fields); }
  }
  return <section className="block-section"><details><summary>{t("Correct case details")}</summary>
    <p>{t("Existing commitment history is preserved. Changes to area or timing may be blocked while a connection is active; safety restrictions cannot be removed here.")}</p>
    <form className="stack" onSubmit={submit}>
      <fieldset><legend className="field-label">{t("Categories")}</legend><div className="category-options">{categories.map(category => <label className="category-option" key={category}><input type="checkbox" disabled={busy} checked={selected.includes(category)} onChange={event => edit({ categories: event.target.checked ? [...selected, category] : selected.filter(item => item !== category) })}/>{t(category)}</label>)}</div></fieldset>
      <div className="filter-grid">
        <label className="field">{t("Neighborhood")}<select disabled={busy} value={area} onChange={event => edit({ area: AreaSchema.parse(event.target.value) })}>{areas.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <label className="field">{t("Urgency")}<select disabled={busy} value={urgency} onChange={event => edit({ urgency: UrgencySchema.parse(event.target.value) })}>{UrgencySchema.options.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
        <label className="field">{t("Window starts")}<input type="datetime-local" disabled={busy} required value={start} onChange={event => edit({ start: event.target.value })}/></label>
        <label className="field">{t("Window ends")}<input type="datetime-local" disabled={busy} required value={end} onChange={event => edit({ end: event.target.value })}/></label>
      </div>
      <label className="field">{t("Private reason for correction")}<textarea disabled={busy} required minLength={8} maxLength={500} value={reason} onChange={event => { editVersion.current++; setReason(event.target.value); }}/></label>
      <ActionError message={t(validationError || error)}/><Button disabled={busy || !selected.length}>{t("Save correction")}</Button>
    </form>
  </details></section>;
}

function Notes({ detail }: { detail: RequestDetail }) {
  const { t, locale } = useLocale();
  const { state, busy } = useNetwork();
  const { error, run } = useCaseAction();
  const [note, setNote] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await run({ type: 'addCoordinatorNote', requestId: detail.request.id, text: note }, t('Private note saved.'))) setNote('');
  }
  return <section className="block-section"><h2>{t("Private coordinator notes")}</h2><p>{t("Visible only to coordinators in this community.")}</p>
    {detail.coordinatorNotes.map(item => <div className="message" key={item.id}><small>{state.users.find(user => user.id === item.actorId)?.name ?? t('Coordinator')} · {dateLabel(item.at, locale)}</small><p>{item.text}</p></div>)}
    {!detail.coordinatorNotes.length && <p>{t("No private notes yet.")}</p>}
    <form onSubmit={submit} className="field"><label htmlFor="coordinator-note">{t("Add private note")}</label><textarea id="coordinator-note" required minLength={1} maxLength={2000} value={note} onChange={event => setNote(event.target.value)}/><ActionError message={t(error)}/><Button secondary disabled={busy || !note.trim()}>{t("Save note")}</Button></form>
  </section>;
}

function Episode({ episode }: { episode: RequestDetail['followUpEpisodes'][number] }) {
  const { t, locale } = useLocale();
  const { state, busy } = useNetwork();
  const { error, run } = useCaseAction();
  const coordinators = state.users.filter(user => user.role === 'coordinator' && user.communityId === state.actor.communityId);
  const [target, setTarget] = useState(state.actor.id);
  const [reason, setReason] = useState('');
  async function escalate(event: FormEvent) {
    event.preventDefault();
    if (await run({ type: 'escalateFollowUp', id: episode.id, coordinatorId: target, note: reason }, t('Escalation recorded.'))) setReason('');
  }
  return <article className="surface stack">
    <div><h3>{t(episode.description)}</h3><p>{episode.resolvedAt ? `${t('Resolved')} ${dateLabel(episode.resolvedAt, locale)}` : t("Unresolved episode")} {t("· Opened")} {dateLabel(episode.openedAt, locale)}{episode.acknowledgedAt ? ` · ${t('Acknowledged')} ${dateLabel(episode.acknowledgedAt, locale)}` : ''}</p></div>
    {episode.escalations.map((item, index) => <p key={`${item.at}-${index}`}>{t("Escalated to")} {state.users.find(user => user.id === item.coordinatorId)?.name ?? 'coordinator'} · {dateLabel(item.at, locale)}<br/>{item.note}</p>)}
    {!episode.resolvedAt && <><div className="button-row">
      {!episode.acknowledgedAt && <Button secondary disabled={busy} onClick={() => void run({ type: 'acknowledgeFollowUp', id: episode.id }, t('Acknowledgment recorded. The condition remains visible.'))}>{t("Acknowledge")}</Button>}
      <Button secondary disabled={busy} onClick={() => void run({ type: 'resolveFollowUp', id: episode.id }, t('Resolution checked.'))}>{t("Check resolution")}</Button>
    </div><details><summary>{t("Escalate privately")}</summary><form className="stack" onSubmit={escalate}>
      <label className="field">{t("Coordinator")}<select value={target} onChange={event => setTarget(event.target.value)}>{coordinators.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <label className="field">{t("Reason")}<textarea required value={reason} minLength={8} maxLength={500} onChange={event => setReason(event.target.value)}/></label>
      <Button secondary disabled={busy || reason.trim().length < 8}>{t("Record escalation")}</Button>
    </form></details><ActionError message={t(error)}/></>}
  </article>;
}

export function CoordinatorCase({ detail }: { detail: RequestDetail }) {
  const { t } = useLocale();
  const { state } = useNetwork();
  if (state.actor.role !== 'coordinator') return null;
  return <><Ownership detail={detail}/><Correction detail={detail}/><Notes detail={detail}/><section className="block-section"><h2>{t("Follow-up history")}</h2><p>{t("Acknowledgment records attention but does not clear an active condition. Resolution is checked against the current case.")}</p>{!detail.followUpEpisodes.length && <p>{t("No follow-up episodes recorded.")}</p>}{detail.followUpEpisodes.map(episode => <Episode key={episode.id} episode={episode}/>)}</section></>;
}
