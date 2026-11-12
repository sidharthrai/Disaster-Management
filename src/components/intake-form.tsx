'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle, ArrowRight, LockSimple, CheckCircle } from '@phosphor-icons/react';
import { areas, categories, CategorySchema, AreaSchema, type Category } from '@/domain/model';
import { ExtractionSchema, type Extraction } from '@/domain/intake';
import type { IntakePreview } from '@/domain/views';
import { analyzeIntake } from '@/lib/api';
import { applyReviewedUrgency, reviewedInitialUrgency } from '@/lib/intake-urgency';
import { SourceSchema } from '@/domain/inputs';
import { IntakeDraftListSchema, IntakeDraftResponseSchema } from '@/domain/intake-drafts';
import { useProviderName } from './workspace';
import { useNetwork } from './network-context';
import { Badge, Button, CategoryIcon, PageHeading, dateLabel } from './ui';
import { useLocale } from './locale-context';
import { VoiceIntakeButton } from './voice-intake';

const windowDateLabel = (iso: string, locale: 'en' | 'es') => new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago', timeZoneName: 'short' }).format(new Date(iso));

const examples = [
  { label: 'Everyday groceries', text: 'My grandmother needs help getting groceries near Central Park today. I am away and cannot help.' },
  { label: 'Two separate needs', text: 'I need groceries and a ride to the community center near Central Park tomorrow.' },
  { label: 'Simulated flood transcript', text: 'We are near River Street. Flood water is rising and one person cannot walk. We need transportation to a safe shelter.' },
  { label: 'Private referral', text: 'I need medical assistance and access to my prescription near Riverside today.' },
];
export function IntakeForm({ studio = false, embedded = false, initialUrgency, onCreated }: { studio?: boolean; embedded?: boolean; initialUrgency?: 'Urgent'; onCreated?: (id: string) => void }) {
  const { locale, t } = useLocale();
  const { state, command, busy, identityChanging } = useNetwork(); const router = useRouter(); const provider = useProviderName();
  const analysisVersion = useRef(0);
  const actor = useRef({ id: state.actor.id, identityChanging }); actor.current = { id: state.actor.id, identityChanging };
  const edited = useRef(false); const draftPending = useRef(false);
  const creating = useRef(false); const createdRequest = useRef('');
  const [creatingRequest, setCreatingRequest] = useState(false); const [createdId, setCreatedId] = useState('');
  const [draftId, setDraftId] = useState(''); const [draftActor, setDraftActor] = useState(''); const [draftSaving, setDraftSaving] = useState(false);
  const [text, setText] = useState(''); const [source, setSource] = useState('Website');
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const category = CategorySchema.safeParse(query.get('category')); const area = AreaSchema.safeParse(query.get('area'));
    if (!query.has('draftId') && category.success && category.data !== 'Medical' && category.data !== 'Missing person' && area.success) setText(current => current || `I need help with ${category.data.toLowerCase()} near ${area.data}`);
  }, []);
  const [result, setResult] = useState<IntakePreview | null>(null); const [working, setWorking] = useState(false); const [error, setError] = useState('');
  const [isPrivate, setPrivate] = useState(false);
  const [selected, setSelected] = useState<Category[]>([]); const [area, setArea] = useState(''); const [offset, setOffset] = useState(''); const [duration, setDuration] = useState('4');
  const [urgency, setUrgency] = useState<Extraction['urgency']>('Routine');
  const [timingConfirmed, setTimingConfirmed] = useState(false); const [timingDifferenceAcknowledged, setTimingDifferenceAcknowledged] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('draftId');
    const actorId = state.actor.id;
    setDraftId(''); setDraftActor('');
    if (!id || identityChanging || edited.current) return;
    const controller = new AbortController();
    fetch('/api/intake-drafts', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Could not load the draft.');
      return IntakeDraftListSchema.parse(await response.json());
    }).then(data => {
      if (controller.signal.aborted || edited.current || actor.current.id !== actorId || actor.current.identityChanging) return;
      const draft = data.drafts.find(item => item.id === id && item.requesterId === actorId && item.status === 'awaiting_details');
      if (!draft) throw new Error('Your active draft could not be found.');
      setText(draft.text); setSource(draft.source); setDraftId(draft.id); setDraftActor(actorId);
    }).catch(err => { if (!controller.signal.aborted && actor.current.id === actorId && !actor.current.identityChanging) setError(err instanceof Error ? err.message : 'Could not load the draft.'); });
    return () => controller.abort();
  }, [state.actor.id, identityChanging]);
  const start = offset === '' ? null : new Date(Date.parse(state.settings.now) + Number(offset) * 3600000).toISOString();
  const end = start === null ? null : new Date(Date.parse(start) + Number(duration) * 3600000).toISOString();
  async function analyze(event: FormEvent) {
    event.preventDefault(); const version = ++analysisVersion.current; setWorking(true); setError(''); setResult(null);
    try { const next = await analyzeIntake(text, SourceSchema.parse(source)); if (version !== analysisVersion.current) return; setResult(next); setSelected(next.extraction.categories); setArea(next.extraction.area ?? ''); setUrgency(reviewedInitialUrgency(next.extraction, initialUrgency ?? new URLSearchParams(window.location.search).get('urgency'))); setOffset(''); setTimingConfirmed(false); setTimingDifferenceAcknowledged(false); }
    catch (err) { if (version === analysisVersion.current) setError(err instanceof Error ? err.message : 'Could not process this message.'); }
    finally { if (version === analysisVersion.current) setWorking(false); }
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    if (creating.current || createdRequest.current || busy || identityChanging || draftPending.current) return;
    creating.current = true; setCreatingRequest(true); setError('');
    try {
      if (!result || !start || !end || !timingConfirmed || (result.extraction.timing && !timingDifferenceAcknowledged)) throw new Error('Choose and confirm the requested time window.');
      const parsedSource = SourceSchema.parse(source);
      const reviewedUrgency = applyReviewedUrgency(result.extraction, urgency);
      const id = await command({ type: 'createRequest', input: { text, categories: selected, area: AreaSchema.parse(area), windowStart: start, windowEnd: end, source: parsedSource, private: isPrivate, previewToken: result.previewToken, urgency: reviewedUrgency, timingConfirmed: true } }, 'Request created. Your original message is private.');
      if (id) {
        createdRequest.current = id; setCreatedId(id);
        if (draftId && draftActor === state.actor.id && actor.current.id === draftActor && !actor.current.identityChanging) {
          try {
            const response = await fetch('/api/intake-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'convert', id: draftId, requestId: id }) });
            if (!response.ok || !IntakeDraftResponseSchema.safeParse(await response.json()).success) throw new Error('Link failed');
          } catch { window.alert(`Your request was created, but its draft could not be linked. Use request ID ${id} in the private draft inbox to link it; do not create another request.`); }
        }
        if (onCreated) onCreated(id); else router.push(`/requests/${id}`);
      } else { createdRequest.current = 'unknown'; setCreatedId('unknown'); throw new Error('Request creation returned no reference. Check your requests before trying again.'); }
    } catch (err) { setError(createdRequest.current === 'unknown' ? 'Request creation returned no reference. Check your requests before trying again.' : createdRequest.current ? 'Your request was created. Open it using the link below.' : err instanceof Error ? err.message : 'Check the request details.'); }
    finally { creating.current = false; setCreatingRequest(false); }
  }
  function invalidateAnalysis() { analysisVersion.current++; setWorking(false); setResult(null); setError(''); setTimingConfirmed(false); setTimingDifferenceAcknowledged(false); }
  function changeText(value: string | ((previous: string) => string)) { edited.current = true; setText(value); invalidateAnalysis(); }
  async function saveDraft() {
    if (busy || identityChanging || draftSaving || draftPending.current || creating.current || createdRequest.current) return;
    const actorId = state.actor.id; draftPending.current = true; setDraftSaving(true); setError('');
    try {
      const input = { text, source: SourceSchema.parse(source) };
      const action = draftId && draftActor === actorId ? { action: 'update', id: draftId, input } : { action: 'create', input };
      const response = await fetch('/api/intake-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string' ? body.error : 'Could not save the draft.');
      IntakeDraftResponseSchema.parse(body);
      if (actor.current.id === actorId && !actor.current.identityChanging) router.push('/intake-drafts');
    } catch (err) { if (actor.current.id === actorId && !actor.current.identityChanging) setError(err instanceof Error ? err.message : 'Could not save the draft.'); }
    finally { draftPending.current = false; setDraftSaving(false); }
  }
  return <>{embedded ? <div className="mb-5"><h2 className="text-xl font-semibold">{t('Request urgent help')}</h2><p className="mt-2 text-sm text-muted">{t('Tell us what is needed. You will review the details and timing before sharing.')}</p></div> : <PageHeading eyebrow={studio ? t('One pipeline. Many ways to ask.') : t('Your neighbors are a good place to start.')} title={studio ? t('Intake studio') : t('What could you use a hand with?')} description={studio ? t('Paste a transcript or choose a labeled simulation. Every source becomes a trackable request through the same intake flow.') : t('Tell us in your own words. We’ll help organize the details, and you stay in control of what gets posted.')} />}
    <div className={embedded ? '' : 'content-with-aside'}><section><form className="surface space-y-6" onSubmit={analyze}><div className="field"><label htmlFor="source">{t('Where did this message come from?')}</label><select id="source" value={source} onChange={e => { edited.current = true; setSource(e.target.value); invalidateAnalysis(); }}><option value="Website">{t('Website')}</option><option value="Phone transcript">{t('Phone transcript')}</option><option value="Voice transcript">{t('Voice transcript')}</option><option value="SMS simulation">{t('SMS simulation')}</option><option value="Social simulation">{t('Social simulation')}</option></select><small>{t('Calls, SMS, and social integrations are simulated. You can paste a transcript or use optional browser speech recognition where supported.')}</small></div>
      <div className="notice-box">{t('Intake provider:')} {provider}. {provider === "Hosted model" ? t('Your text is sent to the configured external provider for analysis.') : provider === "Ollama local model" ? t('Your text is sent to the configured Ollama service.') : t('The no-key fallback processes text locally.')} {t('Results are provisional.')} {t('Analysis may not understand Spanish; review all results carefully.')}</div><div className="field"><label htmlFor="need-text">{t('Describe the help needed')}</label><textarea id="need-text" rows={6} required minLength={8} maxLength={6000} value={text} onChange={e => changeText(e.target.value)} placeholder={t('I could use help picking up groceries near Central Park today…')} /><small>{t('Leave out exact addresses and contact details. You can share them privately after connecting.')}</small></div>
      <VoiceIntakeButton key={state.actor.id} language={locale === 'es' ? 'es-ES' : 'en-US'} disabled={busy || working || draftSaving || identityChanging || creatingRequest || Boolean(createdId)} onTranscript={segment => changeText(previous => previous ? `${previous.trimEnd()} ${segment}` : segment)} />
      <Button disabled={working || busy || draftSaving || identityChanging || creatingRequest || Boolean(createdId)} type="submit"><Sparkle size={18} />{working ? t('Organizing your message…') : t('Help organize this request')}</Button>
      <button className="button-secondary" type="button" disabled={busy || identityChanging || draftSaving || creatingRequest || Boolean(createdId) || text.trim().length < 8 || text.length > 6000} onClick={() => void saveDraft()}>{draftSaving ? t('Saving…') : t('Save privately for later')}</button>
      {working && <div className="space-y-3" role="status"><div className="skeleton h-5 w-4/5" /><div className="skeleton h-5 w-3/5" /><span className="sr-only">{t('Analyzing intake')}</span></div>}</form>
      {error && <div className="inline-error mt-5" role="alert">{error}</div>}{createdId && createdId !== 'unknown' && <p className="mt-5"><a className="text-link" href={`/requests/${encodeURIComponent(createdId)}`}>{t('Open your created request')}</a></p>}
      {result && <form className="surface mt-6 space-y-6" onSubmit={create}><div className="flex items-center justify-between gap-3"><h2>{t('Review before sharing')}</h2><Badge tone="green">{result.provider}</Badge></div>{result.warning && <p className="notice-box">{result.warning}</p>}
        <p className="text-sm text-muted">{t('Analysis results are shown in English and require review.')}</p><p className="text-sm text-muted">{t('These provisional details are shown privately for your review. Correct them before creating the request.')}</p>
        <div className="notice-box"><strong>{t('Message summary')}</strong><p className="mt-2">{result.extraction.summary}</p><p className="mt-3"><strong>{t('Suggested next step:')}</strong> {result.extraction.nextAction}</p><p className="mt-3"><strong>{t('People affected:')}</strong> {result.extraction.peopleAffected ?? t('Unknown')} <strong>{t('Mobility assistance:')}</strong> {result.extraction.mobilityAssistance ? t('Possible need mentioned') : t('Unknown')}</p><p className="mt-3">{t('These details reflect explicit wording in the message and need human review. Resource units are separate from people counts; the organization must confirm suitability for the group.')}</p></div>
        {result.extraction.safetyFlags.length > 0 && <div className="warning-box"><LockSimple size={21} /><div><strong>{t('Private coordinator review required')}</strong><p>{t('This message may involve a sensitive or dangerous situation. It will stay out of community listings. For immediate danger, contact appropriate local emergency services; this app does not dispatch help.')}</p></div></div>}
        <fieldset><legend className="field-label">{t('What help is needed?')}</legend><div className="category-options">{categories.map(category => <label key={category} className={`category-option ${selected.includes(category) ? 'selected' : ''}`}><input type="checkbox" checked={selected.includes(category)} onChange={e => setSelected(e.target.checked ? [...selected, CategorySchema.parse(category)] : selected.filter(c => c !== category))} /><CategoryIcon category={category} size={17} />{t(category)}</label>)}</div></fieldset>
        <div className="field"><label htmlFor="request-area">{t('General neighborhood')}</label><select id="request-area" required value={area} onChange={e => setArea(e.target.value)}><option value="">{t('Choose a neighborhood')}</option>{areas.map(a => <option key={a}>{a}</option>)}</select>{!result.extraction.area && <small>{t('Not found in the message. Please choose it yourself.')}</small>}</div>
        <div className="space-y-4"><p className="text-sm"><strong>{t('Timing mentioned:')}</strong> {result.extraction.timing ?? t('Not specified')}</p><div className="grid gap-5 sm:grid-cols-2"><div className="field"><label htmlFor="window-start">{t('Start relative to demo time')}</label><select id="window-start" required value={offset} onChange={e => { setOffset(e.target.value); setTimingConfirmed(false); setTimingDifferenceAcknowledged(false); }}><option value="">{t('Choose a start time')}</option><option value="0">{t('Now')}</option><option value="4">{t('In 4 hours')}</option><option value="12">{t('In 12 hours')}</option><option value="24">{t('In 24 hours')}</option></select></div><div className="field"><label htmlFor="window-duration">{t('Requested window')}</label><select id="window-duration" value={duration} onChange={e => { setDuration(e.target.value); setTimingConfirmed(false); setTimingDifferenceAcknowledged(false); }}><option value="2">{t('2 hours')}</option><option value="4">{t('4 hours')}</option><option value="8">{t('8 hours')}</option></select></div></div>
          {start && end && <><p className="text-sm"><strong>{t('Chosen window:')}</strong> {windowDateLabel(start, locale)} {t('to')} {windowDateLabel(end, locale)}</p><label className="privacy-choice"><input type="checkbox" checked={timingConfirmed} onChange={e => setTimingConfirmed(e.target.checked)} /><span>{t('I confirm this start and end time.')}</span></label>{result.extraction.timing && <label className="privacy-choice"><input type="checkbox" checked={timingDifferenceAcknowledged} onChange={e => setTimingDifferenceAcknowledged(e.target.checked)} /><span>{t('I have compared this window with')} “{result.extraction.timing}” {t('in the message and accept any difference.')}</span></label>}</>}
        </div>
        <div className="field"><label htmlFor="urgency">{t('Urgency')}</label><select id="urgency" value={urgency} disabled={result.extraction.safetyFlags.length > 0} onChange={e => setUrgency(ExtractionSchema.shape.urgency.parse(e.target.value))}><option value="Routine">{t('Routine')}</option><option value="Time sensitive">{t('Time sensitive')}</option><option value="Urgent">{t('Urgent')}</option><option value="Critical review">{t('Critical review')}</option></select><small>{result.extraction.safetyFlags.length > 0 ? t('Safety flags require Critical review.') : t('You can change the suggested urgency.')} {result.extraction.urgencyReason}</small></div>
        <div className="notice-box"><strong>{t('Missing information')}</strong>{result.extraction.missingInformation.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{result.extraction.missingInformation.map(item => <li key={item}>{item}</li>)}</ul> : <p className="mt-2">{t('None identified.')}</p>}</div>
        <label className="privacy-choice"><input type="checkbox" checked={isPrivate} onChange={e => setPrivate(e.target.checked)}/> <span><strong>{t('Keep this request private for coordinator review.')}</strong><br/>{t('Ordinary helpers cannot browse or match it. A coordinator may review and refer it to an eligible organization.')}</span></label><Button type="submit" disabled={busy || draftSaving || identityChanging || creatingRequest || Boolean(createdId) || selected.length === 0 || !start || !timingConfirmed || Boolean(result.extraction.timing && !timingDifferenceAcknowledged)}>{t('Create trackable request')}<ArrowRight size={18} /></Button></form>}
    </section>{!embedded && <aside className="right-rail"><div className="rail-note"><div className="eyebrow">{t('Try a synthetic example')}</div><div className="mt-5 grid gap-3">{examples.map(example => <button key={example.label} className="example-button" onClick={() => { changeText(example.text); if (example.label.includes('transcript')) setSource('Phone transcript'); }}>{t(example.label)}<ArrowRight size={16} /></button>)}</div></div><div className="p-1"><CheckCircle size={24} /><h3 className="mt-3">{t('Helpful, without guessing.')}</h3><p className="mt-3 text-sm text-muted">{t('Unknown locations and times remain unknown. Safety rules work independently of the model. Matching and assignments require explicit actions.')}</p><p className="mt-3 text-xs text-muted">{t('Demo clock:')} {dateLabel(state.settings.now, locale)} {t('Central. No real notifications are sent.')}</p></div></aside>}</div></>;
}
