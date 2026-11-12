'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { IntakeDraftListSchema, IntakeDraftResponseSchema, type IntakeDraftCommandSchema } from '@/domain/intake-drafts';
import { SourceSchema } from '@/domain/inputs';
import type { IntakeDraft } from '@/domain/model';
import type { z } from 'zod';
import { useNetwork } from './network-context';
import { PageHeading } from './ui';
import { useLocale } from './locale-context';

export function IntakeDrafts() {
  const { state, revision, busy, identityChanging } = useNetwork();
  const { t, locale } = useLocale();
  const displayState = (value: string) => locale === 'en' ? value.replaceAll('_', ' ') : t(value);
  const actor = state.actor;
  const [drafts, setDrafts] = useState<IntakeDraft[] | null>(null);
  const [loadedFor, setLoadedFor] = useState(''); const [loadedRole, setLoadedRole] = useState('');
  const [selected, setSelected] = useState('');
  const [text, setText] = useState(''); const [source, setSource] = useState('Website');
  const [note, setNote] = useState(''); const [requestId, setRequestId] = useState('');
  const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  const generation = useRef(0); const dirty = useRef(false); const pending = useRef(false);
  useEffect(() => { generation.current++; dirty.current = false; pending.current = false; setDrafts(null); setLoadedFor(''); setLoadedRole(''); setSelected(''); setText(''); setSource('Website'); setNote(''); setRequestId(''); setMessage(''); setSaving(false); }, [actor.id, actor.role, identityChanging]);
  useEffect(() => {
    if (identityChanging || saving) return;
    const controller = new AbortController(); const version = generation.current;
    fetch('/api/intake-drafts', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Could not load private drafts.');
      return IntakeDraftListSchema.parse(await response.json());
    }).then(data => { if (!controller.signal.aborted && version === generation.current) { setDrafts(data.drafts); setLoadedFor(actor.id); setLoadedRole(actor.role); } })
      .catch(error => { if (!controller.signal.aborted && version === generation.current) setMessage(error instanceof Error ? error.message : 'Could not load private drafts.'); });
    return () => controller.abort();
  }, [actor.id, actor.role, identityChanging, revision, saving]);
  const visibleDrafts = loadedFor === actor.id && loadedRole === actor.role && !identityChanging ? drafts : null;
  const draft = visibleDrafts?.find(item => item.id === selected);
  function choose(item: IntakeDraft) { dirty.current = false; setSelected(item.id); setText(item.text); setSource(item.source); setNote(item.requestedInfo); setRequestId(''); setMessage(''); }
  async function execute(command: z.infer<typeof IntakeDraftCommandSchema>) {
    if (busy || identityChanging || saving || pending.current || loadedFor !== actor.id) return;
    const version = generation.current; pending.current = true; setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/intake-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : 'Could not save the draft.');
      const result = IntakeDraftResponseSchema.parse(body);
      if (version !== generation.current) return;
      setDrafts(current => current?.map(item => item.id === result.draft.id ? result.draft : item) ?? null);
      dirty.current = false; setMessage('Draft updated.');
    } catch (error) { if (version === generation.current) setMessage(error instanceof Error ? error.message : 'Could not save the draft.'); }
    finally { if (version === generation.current) { pending.current = false; setSaving(false); } }
  }
  function update(event: FormEvent) { event.preventDefault(); if (draft) void execute({ action: 'update', id: draft.id, input: { text, source: SourceSchema.parse(source) } }); }
  const disabled = busy || identityChanging || saving || loadedFor !== actor.id || loadedRole !== actor.role;
  return <><PageHeading eyebrow={t('PRIVATE INBOX')} title={t('Incomplete requests')} description={t('Only you and coordinators in your community can see your draft. It is not a request until you complete and submit it.')} />
    {message && <p role="status">{t(message)}</p>}
    {!visibleDrafts && !message && <p>{t('Loading private drafts…')}</p>}
    {visibleDrafts && !visibleDrafts.length && <p>{t('No private drafts yet.')} <Link className="text-link" href="/request">{t('Start a request')}</Link></p>}
    <div className="content-with-aside"><section className="space-y-4">{visibleDrafts?.map(item => <article className="surface" key={item.id}><h2>{t('Draft')} {item.id}</h2><p>{t('Status:')} {displayState(item.status)}</p><p>{t('Updated:')} {item.updatedAt}</p><button className="button-primary" type="button" disabled={disabled} onClick={() => choose(item)}>{t('View draft')}</button></article>)}</section>
    {draft && <aside className="surface space-y-4"><h2>{t('Draft')} {draft.id}</h2><p><strong>{t('Author:')}</strong> {draft.requesterId}</p><p><strong>{t('Status:')}</strong> {displayState(draft.status)}</p><p><strong>{t('Source:')}</strong> {t(draft.source)}</p><p style={{ whiteSpace: 'pre-wrap' }}>{draft.text}</p>{draft.requestedInfo && <p className="notice-box"><strong>{t('Information requested:')}</strong> {draft.requestedInfo}</p>}
      {draft.requestId && <Link className="text-link" href={`/requests/${encodeURIComponent(draft.requestId)}`}>{t('Open linked request')}</Link>}
      {draft.status === 'awaiting_details' && draft.requesterId === actor.id && <><form className="space-y-4" onSubmit={update}><div className="field"><label htmlFor="draft-source">{t('Source')}</label><select id="draft-source" value={source} onChange={event => { dirty.current = true; setSource(event.target.value); }}>{SourceSchema.options.map(option => <option key={option} value={option}>{t(option)}</option>)}</select></div><div className="field"><label htmlFor="draft-text">{t('Message')}</label><textarea id="draft-text" required minLength={8} maxLength={6000} value={text} onChange={event => { dirty.current = true; setText(event.target.value); }} /></div><button className="button-primary" disabled={disabled}>{t('Save changes')}</button></form>
        <p><Link className="text-link" href={`/request?draftId=${encodeURIComponent(draft.id)}`}>{t('Resume request')}</Link> {t('(save changes above first)')}</p><button type="button" className="button-secondary" disabled={disabled} onClick={() => void execute({ action: 'withdraw', id: draft.id })}>{t('Withdraw draft')}</button>
        <form className="space-y-3" onSubmit={event => { event.preventDefault(); void execute({ action: 'convert', id: draft.id, requestId }); }}><label htmlFor="draft-request-id">{t('Link a request you already created')}</label><input id="draft-request-id" value={requestId} maxLength={100} required onChange={event => setRequestId(event.target.value)} /><button className="button-secondary" disabled={disabled}>{t('Link request')}</button></form></>}
      {draft.status === 'awaiting_details' && actor.role === 'coordinator' && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void execute({ action: 'request_information', id: draft.id, note }); }}><div className="field"><label htmlFor="draft-note">{t('Ask the author for information')}</label><textarea id="draft-note" required minLength={1} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></div><button className="button-primary" disabled={disabled}>{t('Save information request')}</button></form>}
      <details><summary>{t('History')}</summary><ul>{draft.history.map((item, index) => <li key={`${item.at}-${index}`}>{displayState(item.action)} — {item.at}</li>)}</ul></details></aside>}</div></>;
}
