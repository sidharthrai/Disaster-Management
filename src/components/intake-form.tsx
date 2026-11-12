'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkle, ArrowRight, LockSimple, CheckCircle } from '@phosphor-icons/react';
import { areas, categories, CategorySchema, AreaSchema, type Category } from '@/domain/model';
import { ExtractionSchema, type Extraction } from '@/domain/intake';
import type { IntakePreview } from '@/domain/views';
import { analyzeIntake } from '@/lib/api';
import { SourceSchema } from '@/domain/inputs';
import { useProviderName } from './workspace';
import { useNetwork } from './network-context';
import { Badge, Button, CategoryIcon, PageHeading, dateLabel } from './ui';

const windowDateLabel = (iso: string) => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago', timeZoneName: 'short' }).format(new Date(iso));

const examples = [
  { label: 'Everyday groceries', text: 'My grandmother needs help getting groceries near Central Park today. I am away and cannot help.' },
  { label: 'Two separate needs', text: 'I need groceries and a ride to the community center near Central Park tomorrow.' },
  { label: 'Simulated flood transcript', text: 'We are near River Street. Flood water is rising and one person cannot walk. We need transportation to a safe shelter.' },
  { label: 'Private referral', text: 'I need medical assistance and access to my prescription near Riverside today.' },
];
export function IntakeForm({ studio = false }: { studio?: boolean }) {
  const { state, command, busy } = useNetwork(); const router = useRouter(); const provider = useProviderName();
  const analysisVersion = useRef(0);
  const [text, setText] = useState(''); const [source, setSource] = useState('Website');
  const [result, setResult] = useState<IntakePreview | null>(null); const [working, setWorking] = useState(false); const [error, setError] = useState('');
  const [isPrivate, setPrivate] = useState(false);
  const [selected, setSelected] = useState<Category[]>([]); const [area, setArea] = useState(''); const [offset, setOffset] = useState(''); const [duration, setDuration] = useState('4');
  const [urgency, setUrgency] = useState<Extraction['urgency']>('Routine');
  const [timingConfirmed, setTimingConfirmed] = useState(false); const [timingDifferenceAcknowledged, setTimingDifferenceAcknowledged] = useState(false);
  const start = offset === '' ? null : new Date(Date.parse(state.settings.now) + Number(offset) * 3600000).toISOString();
  const end = start === null ? null : new Date(Date.parse(start) + Number(duration) * 3600000).toISOString();
  async function analyze(event: FormEvent) {
    event.preventDefault(); const version = ++analysisVersion.current; setWorking(true); setError(''); setResult(null);
    try { const next = await analyzeIntake(text, SourceSchema.parse(source)); if (version !== analysisVersion.current) return; setResult(next); setSelected(next.extraction.categories); setArea(next.extraction.area ?? ''); setUrgency(next.extraction.safetyFlags.length ? 'Critical review' : next.extraction.urgency); setOffset(''); setTimingConfirmed(false); setTimingDifferenceAcknowledged(false); }
    catch (err) { if (version === analysisVersion.current) setError(err instanceof Error ? err.message : 'Could not process this message.'); }
    finally { if (version === analysisVersion.current) setWorking(false); }
  }
  async function create(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      if (!result || !start || !end || !timingConfirmed || (result.extraction.timing && !timingDifferenceAcknowledged)) throw new Error('Choose and confirm the requested time window.');
      const parsedSource = SourceSchema.parse(source);
      const id = await command({ type: 'createRequest', input: { text, categories: selected, area: AreaSchema.parse(area), windowStart: start, windowEnd: end, source: parsedSource, private: isPrivate, previewToken: result.previewToken, urgency, timingConfirmed: true } }, 'Request created. Your original message is private.');
      if (id) router.push(`/requests/${id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Check the request details.'); }
  }
  function invalidateAnalysis() { analysisVersion.current++; setWorking(false); setResult(null); setError(''); setTimingConfirmed(false); setTimingDifferenceAcknowledged(false); }
  function changeText(value: string) { setText(value); invalidateAnalysis(); }
  return <><PageHeading eyebrow={studio ? 'One pipeline. Many ways to ask.' : 'Your neighbors are a good place to start.'} title={studio ? 'Intake studio' : 'What could you use a hand with?'} description={studio ? 'Paste a transcript or choose a labeled simulation. Every source becomes a trackable request through the same intake flow.' : 'Tell us in your own words. We’ll help organize the details, and you stay in control of what gets posted.'} />
    <div className="content-with-aside"><section><form className="surface space-y-6" onSubmit={analyze}><div className="field"><label htmlFor="source">Where did this message come from?</label><select id="source" value={source} onChange={e => { setSource(e.target.value); invalidateAnalysis(); }}><option>Website</option><option>Phone transcript</option><option>Voice transcript</option><option>SMS simulation</option><option>Social simulation</option></select><small>Transcripts are pasted text; calls, speech transcription, SMS, and social integrations are simulated.</small></div>
      <div className="notice-box">Intake provider: {provider}. {provider === "Hosted model" ? "Your text is sent to the configured external provider for analysis." : provider === "Ollama local model" ? "Your text is sent to the configured Ollama service." : "The no-key fallback processes text locally."} Results are provisional.</div><div className="field"><label htmlFor="need-text">Describe the help needed</label><textarea id="need-text" rows={6} required minLength={8} maxLength={6000} value={text} onChange={e => changeText(e.target.value)} placeholder="I could use help picking up groceries near Central Park today…" /><small>Leave out exact addresses and contact details. You can share them privately after connecting.</small></div>
      <Button disabled={working || busy} type="submit"><Sparkle size={18} />{working ? 'Organizing your message…' : 'Help organize this request'}</Button>
      {working && <div className="space-y-3" role="status"><div className="skeleton h-5 w-4/5" /><div className="skeleton h-5 w-3/5" /><span className="sr-only">Analyzing intake</span></div>}</form>
      {error && <div className="inline-error mt-5" role="alert">{error}</div>}
      {result && <form className="surface mt-6 space-y-6" onSubmit={create}><div className="flex items-center justify-between gap-3"><h2>Review before sharing</h2><Badge tone="green">{result.provider}</Badge></div>{result.warning && <p className="notice-box">{result.warning}</p>}
        <p className="text-sm text-muted">These provisional details are shown privately for your review. Correct them before creating the request.</p>
        <div className="notice-box"><strong>Message summary</strong><p className="mt-2">{result.extraction.summary}</p><p className="mt-3"><strong>Suggested next step:</strong> {result.extraction.nextAction}</p><p className="mt-3"><strong>People affected:</strong> {result.extraction.peopleAffected ?? 'Unknown'}</p></div>
        {result.extraction.safetyFlags.length > 0 && <div className="warning-box"><LockSimple size={21} /><div><strong>Private coordinator review required</strong><p>This message may involve a sensitive or dangerous situation. It will stay out of community listings. For immediate danger, contact appropriate local emergency services; this app does not dispatch help.</p></div></div>}
        <fieldset><legend className="field-label">What help is needed?</legend><div className="category-options">{categories.map(category => <label key={category} className={`category-option ${selected.includes(category) ? 'selected' : ''}`}><input type="checkbox" checked={selected.includes(category)} onChange={e => setSelected(e.target.checked ? [...selected, CategorySchema.parse(category)] : selected.filter(c => c !== category))} /><CategoryIcon category={category} size={17} />{category}</label>)}</div></fieldset>
        <div className="field"><label htmlFor="request-area">General neighborhood</label><select id="request-area" required value={area} onChange={e => setArea(e.target.value)}><option value="">Choose a neighborhood</option>{areas.map(a => <option key={a}>{a}</option>)}</select>{!result.extraction.area && <small>Not found in the message. Please choose it yourself.</small>}</div>
        <div className="space-y-4"><p className="text-sm"><strong>Timing mentioned:</strong> {result.extraction.timing ?? 'Not specified'}</p><div className="grid gap-5 sm:grid-cols-2"><div className="field"><label htmlFor="window-start">Start relative to demo time</label><select id="window-start" required value={offset} onChange={e => { setOffset(e.target.value); setTimingConfirmed(false); setTimingDifferenceAcknowledged(false); }}><option value="">Choose a start time</option><option value="0">Now</option><option value="4">In 4 hours</option><option value="12">In 12 hours</option><option value="24">In 24 hours</option></select></div><div className="field"><label htmlFor="window-duration">Requested window</label><select id="window-duration" value={duration} onChange={e => { setDuration(e.target.value); setTimingConfirmed(false); setTimingDifferenceAcknowledged(false); }}><option value="2">2 hours</option><option value="4">4 hours</option><option value="8">8 hours</option></select></div></div>
          {start && end && <><p className="text-sm"><strong>Chosen window:</strong> {windowDateLabel(start)} to {windowDateLabel(end)}</p><label className="privacy-choice"><input type="checkbox" checked={timingConfirmed} onChange={e => setTimingConfirmed(e.target.checked)} /><span>I confirm this start and end time.</span></label>{result.extraction.timing && <label className="privacy-choice"><input type="checkbox" checked={timingDifferenceAcknowledged} onChange={e => setTimingDifferenceAcknowledged(e.target.checked)} /><span>I have compared this window with “{result.extraction.timing}” in the message and accept any difference.</span></label>}</>}
        </div>
        <div className="field"><label htmlFor="urgency">Urgency</label><select id="urgency" value={urgency} disabled={result.extraction.safetyFlags.length > 0} onChange={e => setUrgency(ExtractionSchema.shape.urgency.parse(e.target.value))}><option>Routine</option><option>Time sensitive</option><option>Urgent</option><option>Critical review</option></select><small>{result.extraction.safetyFlags.length > 0 ? 'Safety flags require Critical review.' : 'You can change the suggested urgency.'} {result.extraction.urgencyReason}</small></div>
        <div className="notice-box"><strong>Missing information</strong>{result.extraction.missingInformation.length ? <ul className="mt-2 list-disc space-y-1 pl-5">{result.extraction.missingInformation.map(item => <li key={item}>{item}</li>)}</ul> : <p className="mt-2">None identified.</p>}</div>
        <label className="privacy-choice"><input type="checkbox" checked={isPrivate} onChange={e => setPrivate(e.target.checked)}/> <span><strong>Keep this request private for coordinator review.</strong><br/>Ordinary helpers cannot browse or match it. A coordinator may review and refer it to an eligible organization.</span></label><Button type="submit" disabled={busy || selected.length === 0 || !start || !timingConfirmed || Boolean(result.extraction.timing && !timingDifferenceAcknowledged)}>Create trackable request<ArrowRight size={18} /></Button></form>}
    </section><aside className="right-rail"><div className="rail-note"><div className="eyebrow">Try a synthetic example</div><div className="mt-5 grid gap-3">{examples.map(example => <button key={example.label} className="example-button" onClick={() => { changeText(example.text); if (example.label.includes('transcript')) setSource('Phone transcript'); }}>{example.label}<ArrowRight size={16} /></button>)}</div></div><div className="p-1"><CheckCircle size={24} /><h3 className="mt-3">Helpful, without guessing.</h3><p className="mt-3 text-sm text-muted">Unknown locations and times remain unknown. Safety rules work independently of the model. Matching and assignments require explicit actions.</p><p className="mt-3 text-xs text-muted">Demo clock: {dateLabel(state.settings.now)} Central. No real notifications are sent.</p></div></aside></div></>;
}
