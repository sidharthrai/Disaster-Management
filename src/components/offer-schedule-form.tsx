'use client';
import { useLocale } from './locale-context';
import { useState, type FormEvent } from 'react';
import { areas, categories, AreaSchema, CategorySchema, type Category } from '@/domain/model';
import { previewOfferSchedule } from '@/domain/offer-schedule';
import { useNetwork } from './network-context';
import { Button } from './ui';

type Area = typeof areas[number];
export function OfferScheduleForm({ initialArea, initialCategory }: { initialArea: Area; initialCategory?: Category }) { const { t, locale } = useLocale();
  const { state, refresh, busy } = useNetwork();
  const [description, setDescription] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [selectedCategories, setCategories] = useState<Category[]>(initialCategory ? [initialCategory] : []);
  const [selectedAreas, setAreas] = useState<Area[]>([initialArea]);
  const [startLocal, setStart] = useState(''); const [endLocal, setEnd] = useState(''); const [weeks, setWeeks] = useState(1);
  const [reviewed, setReviewed] = useState(''); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const input = { description, affiliation, categories: selectedCategories, areas: selectedAreas, startLocal, endLocal, weeks, confirmed: true };
  const reviewKey = JSON.stringify(input); let windows: ReturnType<typeof previewOfferSchedule> = []; let previewError = '';
  try { windows = previewOfferSchedule(input); if (windows.some(window => Date.parse(window.startAt) <= Date.parse(state.settings.now))) previewError = 'Every window must start in the future.'; }
  catch (err) { if (startLocal && endLocal && description.length >= 8 && selectedCategories.length && selectedAreas.length) previewError = err instanceof Error ? err.message : 'Check your schedule.'; }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setSaving(true);
    try {
      const response = await fetch('/api/offers/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      const result = await response.json(); if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Could not save your schedule.');
      setReviewed(''); setMessage(t('Saved {count} individual offers. You can manage each one below.').replace('{count}', String(result.ids.length)));
      try { await refresh(); } catch { setMessage(t('Saved {count} individual offers. Refresh the page to see them.').replace('{count}', String(result.ids.length))); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save your schedule.'); }
    finally { setSaving(false); }
  }
  return <form className="surface stack" onSubmit={submit}>
    <h2>{t("Schedule weekly offers")}</h2><p>{t("Choose up to four dated weekly windows and five neighborhoods. Each offer is managed separately; no future weeks are added automatically. Times are America/Chicago.")}</p>
    <div className="field"><label htmlFor="schedule-description">{t("How can you help?")}</label><textarea id="schedule-description" required minLength={8} maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} /></div>
    <div className="field"><label htmlFor="schedule-affiliation">{t("Organization affiliation (optional, self-described; do not include contact information)")}</label><input id="schedule-affiliation" maxLength={120} value={affiliation} onChange={e => setAffiliation(e.target.value)} /><p>{t("This is not verification or endorsement and does not change eligibility.")}</p></div>
    <fieldset><legend className="field-label">{t("Capabilities")}</legend><div className="category-options">{categories.filter(c => c !== 'Medical' && c !== 'Missing person').map(c => <label className="category-option" key={c}><input type="checkbox" checked={selectedCategories.includes(c)} onChange={e => setCategories(e.target.checked ? [...selectedCategories, CategorySchema.parse(c)] : selectedCategories.filter(value => value !== c))} />{t(c)}</label>)}</div></fieldset>
    <fieldset><legend className="field-label">{t("Neighborhoods")}</legend><div className="category-options">{areas.map(area => <label className="category-option" key={area}><input type="checkbox" checked={selectedAreas.includes(area)} onChange={e => setAreas(e.target.checked ? [...selectedAreas, AreaSchema.parse(area)] : selectedAreas.filter(value => value !== area))} />{area}</label>)}</div></fieldset>
    <div className="field"><label htmlFor="schedule-start">{t("First start (Chicago local time)")}</label><input id="schedule-start" type="datetime-local" required value={startLocal} onChange={e => setStart(e.target.value)} /></div>
    <div className="field"><label htmlFor="schedule-end">{t("First end (Chicago local time)")}</label><input id="schedule-end" type="datetime-local" required value={endLocal} onChange={e => setEnd(e.target.value)} /></div>
    <div className="field"><label htmlFor="schedule-weeks">{t("Number of weekly windows")}</label><select id="schedule-weeks" value={weeks} onChange={e => setWeeks(Number(e.target.value))}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
    {previewError && <div className="inline-error" role="alert">{t(previewError)}</div>}
    {windows.length > 0 && !previewError && <fieldset><legend className="field-label">{t("Review each date")}</legend><p>{t("These are the exact Chicago local times and UTC instants for each selected neighborhood.")}</p><ul>{windows.map(window => <li key={window.startAt}>{window.startLocal} {t("to")} {window.endLocal} Chicago · {window.startAt} {t("to")} {window.endAt} UTC</li>)}</ul><p>{t("Neighborhoods:")} {selectedAreas.join(', ')}.</p><label><input type="checkbox" checked={reviewed === reviewKey} onChange={e => setReviewed(e.target.checked ? reviewKey : '')} /> {t("I reviewed these exact dates, times, and neighborhoods.")}</label></fieldset>}
    {error && <div className="inline-error" role="alert">{t(error)}</div>}{message && <p role="status">{t(message)}</p>}
    <Button disabled={busy || saving || reviewed !== reviewKey || !!previewError || !windows.length}>{t("Save scheduled offers")}</Button>
  </form>;
}
