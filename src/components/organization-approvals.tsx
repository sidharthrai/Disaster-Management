'use client';
import { useLocale } from './locale-context';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { areas, categories } from '@/domain/model';
import { ApprovalListSchema, ApprovalResponseSchema, type ApplicationInput } from '@/domain/organization-approvals';
import { useNetwork } from './network-context';
import { PageHeading, dateLabel } from './ui';

type Applications = ReturnType<typeof ApprovalListSchema.parse>['applications'];
const empty = (): ApplicationInput => ({ description: '', services: [], serviceAreas: [] });
export function OrganizationApprovals() {
  const { t, locale } = useLocale();
  const { state, revision, busy, identityChanging, refresh } = useNetwork();
  const actor = state.actor;
  const [applications, setApplications] = useState<Applications | null>(null);
  const [loadedFor, setLoadedFor] = useState('');
  const [draft, setDraft] = useState<ApplicationInput>(empty);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const current = useRef({ id: actor.id, identityChanging, busy });
  current.current = { id: actor.id, identityChanging, busy };
  useEffect(() => {
    generation.current++; pending.current?.abort(); pending.current = null;
    setApplications(null); setLoadedFor(''); setDraft(empty()); setReasons({}); setMessage(''); setSaving(false);
  }, [actor.id, identityChanging]);
  useEffect(() => {
    if (identityChanging || saving) return;
    const controller = new AbortController(); const version = generation.current;
    fetch('/api/organization-approvals', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Could not load applications.');
      return ApprovalListSchema.parse(await response.json());
    }).then(data => {
      if (!controller.signal.aborted && version === generation.current && current.current.id === actor.id && !current.current.identityChanging) { setApplications(data.applications); setLoadedFor(actor.id); }
    }).catch(error => { if (!controller.signal.aborted && version === generation.current) setMessage(error instanceof Error ? error.message : 'Could not load applications.'); });
    return () => controller.abort();
  }, [actor.id, identityChanging, revision, saving, reload]);
  async function send(command: unknown) {
    if (busy || identityChanging || saving || pending.current || loadedFor !== actor.id) return;
    const controller = new AbortController(); pending.current = controller; const version = generation.current;
    const valid = () => !controller.signal.aborted && version === generation.current && current.current.id === actor.id && !current.current.identityChanging;
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/organization-approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: controller.signal });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string' ? result.error : 'Could not save the change.');
      if (!ApprovalResponseSchema.safeParse(result).success) throw new Error('The server returned an invalid response. Refresh to check your change.');
      if (!valid()) return;
      if (typeof command === 'object' && command !== null && 'action' in command && command.action === 'apply') setDraft(empty());
      setMessage('Change saved.'); setReload(value => value + 1);
      await refresh();
    } catch (error) { if (valid()) setMessage(error instanceof Error ? error.message : 'Could not save the change.'); }
    finally { if (pending.current === controller) { pending.current = null; if (valid()) setSaving(false); } }
  }
  const ready = !busy && !identityChanging && !saving && loadedFor === actor.id;
  const visible = loadedFor === actor.id && !identityChanging ? applications : null;
  const coordinator = actor.role === 'coordinator';
  const mayApply = actor.role === 'member' || (actor.role === 'organization' && !actor.verified);
  const pendingApplication = visible?.some(item => item.status === 'pending');
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void send({ action: 'apply', input: draft }); }
  return <><PageHeading eyebrow={t("COMMUNITY PARTNERS")} title={t("Organization approval")} description={t("Apply for ordinary organization approval or review applications in your community.")}/>
    {message && <p role="status">{t(message)}</p>}
    {!visible && <p>{t("Loading applications…")}</p>}
    {mayApply && visible && !pendingApplication && <section className="panel"><h2>{t("Apply for approval")}</h2><p>{t("Approval does not establish medical or missing-person qualifications.")}</p><form onSubmit={submit}><fieldset disabled={!ready}>
      <label>{t("Organization description")}<textarea required maxLength={1000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label>
      <fieldset><legend>{t("Services")}</legend>{categories.filter(category => category !== 'Medical' && category !== 'Missing person').map(category => <label key={category}><input type="checkbox" checked={draft.services.includes(category)} onChange={event => setDraft({ ...draft, services: event.target.checked ? [...draft.services, category] : draft.services.filter(item => item !== category) })}/> {t(category)}</label>)}</fieldset>
      <fieldset><legend>{t("General service areas")}</legend>{areas.map(area => <label key={area}><input type="checkbox" checked={draft.serviceAreas.includes(area)} onChange={event => setDraft({ ...draft, serviceAreas: event.target.checked ? [...draft.serviceAreas, area] : draft.serviceAreas.filter(item => item !== area) })}/> {area}</label>)}</fieldset>
      <button className="button-primary" disabled={!ready}>{t("Submit application")}</button></fieldset></form></section>}
    {visible && <section><h2>{coordinator ? t("Community applications") : t("Your applications")}</h2>{coordinator && <p>{t("Accounts with existing medical or missing-person qualifications require operator review before approval.")}</p>}{visible.length === 0 && <p>{t("No applications yet.")}</p>}{visible.map(item => <article className="panel" key={item.id}><h3>{item.applicantName}</h3><p>{t("Status:")} {t(item.status)} {t("· Submitted")} {dateLabel(item.submittedAt, locale)}</p><p>{item.description}</p><p>{t("Services:")} {item.services.map(t).join(', ')}</p><p>{t("Areas:")} {item.serviceAreas.join(', ')}</p><ul>{item.history.map((entry, index) => <li key={index}>{t(entry.action)} {t("by")} {entry.actorId} {t("at")} {dateLabel(entry.at, locale)}{entry.reason && `: ${entry.reason}`}</li>)}</ul>
      {item.applicantId === actor.id && item.status === 'pending' && <button disabled={!ready} onClick={() => void send({ action: 'withdraw', id: item.id })}>{t("Withdraw")}</button>}
      {coordinator && item.applicantId !== actor.id && (item.status === 'pending' || item.status === 'approved') && <fieldset disabled={!ready}><label>{t("Decision reason")}<textarea required maxLength={1000} value={reasons[item.id] ?? ''} onChange={event => setReasons({ ...reasons, [item.id]: event.target.value })}/></label>{(item.status === 'pending' ? ['approve', 'decline'] : ['revoke']).map(action => <button key={action} disabled={!ready || !reasons[item.id]?.trim()} onClick={() => void send({ action, id: item.id, reason: reasons[item.id] })}>{t(action)}</button>)}</fieldset>}
    </article>)}</section>}
  </>;
}
