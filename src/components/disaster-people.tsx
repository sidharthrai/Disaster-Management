'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { areas, AreaSchema, CommunityCheckInSchema, CommunityNoticeSchema, PeopleRecordSchema, PeopleStatusSchema } from '@/domain/model';
import { useNetwork } from './network-context';
import { useLocale } from './locale-context';
import styles from './disaster-people.module.css';

type RecordItem = z.infer<typeof PeopleRecordSchema>;
const Projection = z.object({ records: z.array(PeopleRecordSchema), communityNotices: z.array(CommunityNoticeSchema), communityCheckIns: z.array(CommunityCheckInSchema) }).strict();
const ErrorResponse = z.object({ error: z.string() });
const labels = { submitted: 'Submitted', under_review: 'Under review', closed: 'Closed' };

async function responseData(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) { const error = ErrorResponse.safeParse(body); throw new Error(error.success ? error.data.error : 'Unable to complete this action.'); }
  return body;
}

function PeoplePanel({ actorId, coordinator, defaultArea, users, now }: { actorId: string; coordinator: boolean; defaultArea: string; users: { id: string; name: string }[]; now: string }) {
  const { t, locale } = useLocale();
  const [records, setRecords] = useState<RecordItem[] | null>(null);
  const [board, setBoard] = useState<Pick<z.infer<typeof Projection>, 'communityNotices' | 'communityCheckIns'>>({ communityNotices: [], communityCheckIns: [] });
  const [mode, setMode] = useState<'report' | 'check_in' | null>(null);
  const [name, setName] = useState('');
  const [area, setArea] = useState(defaultArea);
  const [relationship, setRelationship] = useState('family');
  const [ageGroup, setAgeGroup] = useState('unknown');
  const [lastSeenAt, setLastSeenAt] = useState('');
  const [lastKnownContext, setLastKnownContext] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [share, setShare] = useState(false);
  const [shareAdultName, setShareAdultName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/disaster/people', { cache: 'no-store', signal: controller.signal }).then(responseData).then(data => { const projection = Projection.parse(data); setRecords(projection.records); setBoard(projection); }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load records.'); });
    return () => controller.abort();
  }, [actorId, revision]);
  const send = useCallback(async (payload: unknown) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      await responseData(await fetch('/api/disaster/people', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
      setRevision(value => value + 1);
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save.'); return false; }
    finally { pending.current = false; setBusy(false); }
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = mode === 'report' ? { action: 'report', personName: name, relationship, area: AreaSchema.parse(area), ageGroup, lastSeenAt: lastSeenAt ? new Date(lastSeenAt).toISOString() : null, lastKnownContext, authorized, shareWithCommunity: share, shareAdultName } : { action: 'check_in', area: AreaSchema.parse(area), shareWithCommunity: share };
    if (await send(payload)) { setMode(null); setName(''); setAgeGroup('unknown'); setLastSeenAt(''); setLastKnownContext(''); setAuthorized(false); setShare(false); setShareAdultName(false); setNotice(mode === 'report' ? 'Report submitted for human review.' : 'Your safe check-in was recorded.'); }
  }
  return <section id="people" className={styles.section} aria-labelledby="people-heading">
    <div className={styles.heading}><div><span className={styles.eyebrow}>{t('People and community')}</span><h2 id="people-heading">{t('Missing people & safe check-ins')}</h2><p>{t('Reports are private to you and community coordinators. You can choose what to share on the community board.')}</p></div><div className={styles.actions}><button type="button" onClick={() => { setMode('report'); setShare(false); setShareAdultName(false); setError(''); }} aria-expanded={mode === 'report'}>{t('Report a missing person')}</button><button type="button" className={styles.secondary} onClick={() => { setMode('check_in'); setShare(false); setShareAdultName(false); setError(''); }} aria-expanded={mode === 'check_in'}>{t('Check in as safe')}</button></div></div>
    <p className={styles.limit}>{t('For immediate danger, contact emergency services. For a missing child, contact the appropriate authorities directly. Private review does not notify authorities, dispatch help, or match identities.')}</p>
    {mode && <form className={styles.form} onSubmit={submit}><div><h3>{mode === 'report' ? t('Report a missing person') : t('Check in as safe')}</h3><p>{mode === 'report' ? t('Share only the information requested here. Do not include contact details or a precise location.') : t('This records your own status and does not update another person’s report.')}</p></div>
      {mode === 'report' && <><label>{t('Person’s name')}<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label><label>{t('Your relationship')}<select value={relationship} onChange={event => setRelationship(event.target.value)}><option value="family">{t('Family')}</option><option value="friend">{t('Friend')}</option><option value="neighbor">{t('Neighbor')}</option><option value="other">{t('Other')}</option></select></label><label>{t('Age group')}<select value={ageGroup} onChange={event => { setAgeGroup(event.target.value); setShareAdultName(false); }}><option value="unknown">{t('Unknown')}</option><option value="adult">{t('Adult')}</option><option value="under_18">{t('Under 18')}</option></select></label><label>{t('Last seen date and time, if known')}<input type="datetime-local" value={lastSeenAt} onChange={event => setLastSeenAt(event.target.value)} /></label><label className={styles.wide}>{t('Brief last-known context, if known')}<textarea maxLength={500} value={lastKnownContext} onChange={event => setLastKnownContext(event.target.value)} /><span>{t('Do not include precise locations or contact details.')}</span></label></>}
      <label>{mode === 'report' ? t('Last known neighborhood') : t('Your neighborhood')}<select value={area} onChange={event => setArea(event.target.value)}>{areas.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label>
      {mode === 'report' && <p className={styles.wide}>{t('Workspace time')}: {new Date(now).toLocaleString(locale)}. {t('Last seen must not be later than this time.')}</p>}
      {mode === 'report' && <label className={styles.check}><input type="checkbox" checked={authorized} required onChange={event => setAuthorized(event.target.checked)} />{t('I have a personal relationship or another legitimate reason to submit this report.')}</label>}
      <label className={styles.check}><input type="checkbox" checked={share} onChange={event => { setShare(event.target.checked); if (!event.target.checked) setShareAdultName(false); }} />{mode === 'report' ? t('Share a notice with community members showing its reference, neighborhood and status. Identifying details stay private unless you separately authorize sharing an adult’s name below.') : t('Share my account display name, neighborhood and self-reported safe status with community members.')}</label>
      {mode === 'report' && share && ageGroup === 'adult' && <label className={styles.check}><input type="checkbox" checked={shareAdultName} onChange={event => setShareAdultName(event.target.checked)} />{t('I am authorized to share this adult’s name with my signed-in community.')}</label>}
      <div className={styles.formActions}><button disabled={busy}>{busy ? t('Saving…') : mode === 'report' ? t('Submit private report') : t('Save check-in')}</button><button className={styles.secondary} type="button" onClick={() => setMode(null)}>{t('Cancel')}</button></div></form>}
    {error && <p className={styles.error} role="alert">{t(error)} {records === null && <button type="button" onClick={() => { setError(''); setRevision(value => value + 1); }}>{t('Try again')}</button>}</p>}{notice && <p className={styles.notice} role="status">{t(notice)}</p>}
    {records !== null && <div className={styles.board}><h3>{t('Community board')}</h3><p>{t('Shared by members of your community. Safe check-ins are self-reported and do not verify wellbeing.')}</p><div className={styles.boardGrid}><section><h4>{t('Missing-person notices')}</h4><p>{t('Names appear only when the reporter authorizes sharing an adult’s name. Send information privately to the reporter and coordinators.')}</p>{board.communityNotices.length ? board.communityNotices.map(item => <CommunityNotice key={item.id} item={item} busy={busy} send={send} />) : <p>{t('No shared notices yet.')}</p>}</section><section><h4>{t('Safe check-ins')}</h4>{board.communityCheckIns.length ? board.communityCheckIns.map(item => <article className={styles.boardRow} key={item.id}><strong>{item.name}</strong><p>{t(item.area)} · {t('Self-reported safe')}</p></article>) : <p>{t('No shared check-ins yet.')}</p>}</section></div></div>}
    <div className={styles.records}><div className={styles.listHeading}><h3>{coordinator ? t('Community review records') : t('Your records')}</h3><span>{t('Private')}</span></div>{records === null ? error ? <p>{t('Records could not be loaded.')}</p> : <div className={styles.loading} role="status"><span className={styles.srOnly}>{t('Loading records…')}</span><span/><span/></div> : records.length === 0 ? <p>{t('No records yet. Reports and check-ins will appear here.')}</p> : records.map(record => <PeopleRecordRow key={record.id} record={record} actorId={actorId} coordinator={coordinator} users={users} busy={busy} send={send} />)}</div>
  </section>;
}

function PeopleRecordRow({ record, actorId, coordinator, users, busy, send }: { record: RecordItem; actorId: string; coordinator: boolean; users: { id: string; name: string }[]; busy: boolean; send: (payload: unknown) => Promise<boolean> }) {
  const { t, locale } = useLocale();
  const [message, setMessage] = useState('');
  const latestExchange = record.history.slice().reverse().find(entry => entry.action === 'information_requested' || entry.action === 'information_replied');
  const pendingQuestion = latestExchange?.action === 'information_requested' ? latestExchange.note : null;
  const canRequest = coordinator && record.kind === 'missing' && record.status !== 'closed' && !pendingQuestion;
  const canReply = record.authorId === actorId && !!pendingQuestion;
  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const payload = canReply ? { action: 'reply_information', id: record.id, reply: message } : { action: 'request_information', id: record.id, question: message };
    if (await send(payload)) setMessage('');
  }
  const ageLabels = { adult: 'Adult', under_18: 'Under 18', unknown: 'Unknown' };
  return <article className={styles.record}><div className={styles.recordContent}>
    <h4>{record.kind === 'missing' ? record.personName : t('Safe check-in')}</h4>
    {coordinator && <p>{t('Submitted by')} {users.find(user => user.id === record.authorId)?.name ?? t('Community member')}</p>}
    <p>{record.kind === 'missing' ? `${t('Missing person report')} · ${t(record.relationship ?? '')} · ${t(ageLabels[record.ageGroup])} · ` : ''}{t(record.area)} · {new Date(record.createdAt).toLocaleString(locale)}</p>
    <p>{record.kind === 'safe_check_in' ? t('Self-reported safe') : t(labels[record.status])}{record.incidentId ? ` · ${t('Linked to an incident')}` : ''}</p>
    {record.kind === 'missing' && <><p>{t('Last seen')}: {record.lastSeenAt ? new Date(record.lastSeenAt).toLocaleString(locale) : t('Unknown')}</p>{record.lastKnownContext && <p>{record.lastKnownContext}</p>}</>}
    {pendingQuestion && <p><strong>{t('Information requested')}:</strong> {pendingQuestion}</p>}
    {record.tips.length > 0 && <details><summary>{t('Private community information')} ({record.tips.length})</summary><ol>{record.tips.map((tip, index) => <li key={`${tip.at}-${index}`}><strong>{users.find(user => user.id === tip.authorId)?.name ?? t('Community member')}</strong> · {new Date(tip.at).toLocaleString(locale)}: {tip.text}</li>)}</ol></details>}
    <details><summary>{t('Report history')}</summary><ol>{record.history.map((entry, index) => <li key={`${entry.at}-${index}`}>{t(entry.action === 'information_requested' ? 'Information requested' : entry.action === 'information_replied' ? 'Author replied' : labels[entry.status])} · {new Date(entry.at).toLocaleString(locale)}{entry.note && <>: {entry.note}</>}</li>)}</ol></details>
    {(canRequest || canReply) && <form className={styles.messageForm} onSubmit={submitMessage}><label>{canReply ? t('Reply to the coordinator') : t('Ask the author for information')}<textarea required maxLength={500} value={message} onChange={event => setMessage(event.target.value)} /></label><p>{t('Do not include precise locations or contact details.')}</p><button disabled={busy}>{canReply ? t('Send private reply') : t('Request information')}</button></form>}
    {record.kind === 'missing' && <p>{t('Closed is an administrative status and does not confirm reunification.')}</p>}
    {record.authorId === actorId && <div className={styles.sharing}><p>{record.shared ? t('Shared on the community board.') : t('Not shared on the community board.')}</p><button type="button" className={styles.secondary} disabled={busy} onClick={() => void send({ action: 'set_visibility', id: record.id, shared: !record.shared })}>{record.shared ? t('Remove from community board') : t('Share on community board')}</button><p>{record.kind === 'missing' ? record.shared && record.shareAdultName ? t('The reference, neighborhood, status and authorized adult name are shared. Removing the notice clears name-sharing permission.') : t('Sharing shows only the reference, neighborhood and status; the person’s name and details stay private.') : t('Sharing shows your account display name, neighborhood and self-reported safe status.')}</p></div>}
  </div>{coordinator && record.kind === 'missing' && <label>{t('Review status')}<select disabled={busy} value={record.status} onChange={event => { const parsed = PeopleStatusSchema.safeParse(event.target.value); if (parsed.success) void send({ action: 'review', id: record.id, status: parsed.data }); }}>{PeopleStatusSchema.options.map(status => <option value={status} key={status}>{t(labels[status])}</option>)}</select></label>}</article>;
}

function CommunityNotice({ item, busy, send }: { item: z.infer<typeof CommunityNoticeSchema>; busy: boolean; send: (payload: unknown) => Promise<boolean> }) {
  const { t } = useLocale();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await send({ action: 'tip', id: item.id, text })) { setText(''); setSent(true); }
  }
  return <article className={styles.boardRow}><strong>{item.personName ?? t('Missing-person notice')} · {item.id.slice(0, 8)}</strong><p>{t(item.area)} · {t(labels[item.status])}</p><details><summary>{t('Send private information')}</summary><form className={styles.messageForm} onSubmit={submit}><label>{t('What would you like the reporter and coordinators to know?')}<textarea required maxLength={500} value={text} onChange={event => { setText(event.target.value); setSent(false); }} /></label><p>{t('Do not include precise locations or contact details. Information is shared privately with the reporter and coordinators.')}</p><button disabled={busy}>{t('Send private information')}</button>{sent && <p role="status">{t('Information sent privately.')}</p>}</form></details></article>;
}

export function DisasterPeople() {
  const { state, identityChanging } = useNetwork();
  if (identityChanging) return null;
  return <PeoplePanel key={state.actor.id} actorId={state.actor.id} coordinator={state.actor.role === 'coordinator'} defaultArea={state.actor.area} users={state.users} now={state.settings.now} />;
}
