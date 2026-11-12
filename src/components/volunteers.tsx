'use client';
import { useLocale } from './locale-context';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { areas } from '@/domain/model';
import { volunteerCategories, volunteerLanguages, VolunteerDirectorySchema, VolunteerSaveResponseSchema, type VolunteerDirectory, type VolunteerProfileInput } from '@/domain/volunteers';
import { useNetwork } from './network-context';
import { Empty, PageHeading } from './ui';

const blank: VolunteerProfileInput = { categories: [], areas: [], languages: [], visible: false };
export function Volunteers() { const { t, locale } = useLocale();
  const { state, revision, busy, identityChanging } = useNetwork();
  const actorId = state.actor.id;
  const member = state.actor.role === 'member';
  const [directory, setDirectory] = useState<VolunteerDirectory | null>(null);
  const [directoryActor, setDirectoryActor] = useState('');
  const [profile, setProfile] = useState<VolunteerProfileInput>(blank);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [area, setArea] = useState('');
  const [language, setLanguage] = useState('');
  const dirty = useRef(false);
  const saveController = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const current = useRef({ actorId, member, identityChanging, busy });
  current.current = { actorId, member, identityChanging, busy };
  useEffect(() => {
    generation.current += 1;
    dirty.current = false; setDirectory(null); setDirectoryActor(''); setProfile(blank); setMessage(''); setSaving(false); setLoading(true);
    return () => { generation.current += 1; saveController.current?.abort(); saveController.current = null; };
  }, [actorId, member, identityChanging]);
  useEffect(() => {
    if (identityChanging || saving) return;
    const controller = new AbortController(); const version = generation.current;
    setLoading(true);
    fetch('/api/volunteers', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Could not load volunteers.');
      const parsed = VolunteerDirectorySchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('Directory returned an invalid response. Please try again.');
      return parsed.data;
    }).then(data => {
      if (controller.signal.aborted || version !== generation.current || current.current.actorId !== actorId || current.current.identityChanging) return;
      setDirectory(data); setDirectoryActor(actorId);
      if (!dirty.current) setProfile(data.ownProfile ?? blank);
    }).catch(error => { if (!controller.signal.aborted && version === generation.current) setMessage(error instanceof Error ? error.message : 'Could not load volunteers.'); })
      .finally(() => { if (!controller.signal.aborted && version === generation.current) setLoading(false); });
    return () => controller.abort();
  }, [actorId, member, identityChanging, revision, saving]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member || identityChanging || busy || saving || loading || directoryActor !== actorId || saveController.current) return;
    const controller = new AbortController(); saveController.current = controller; const version = generation.current;
    const valid = () => !controller.signal.aborted && version === generation.current && current.current.actorId === actorId && current.current.member && !current.current.identityChanging;
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/volunteers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile), signal: controller.signal });
      const result: unknown = await response.json();
      if (!response.ok) {
        const error = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string' ? result.error : 'Could not save your profile.';
        throw new Error(error);
      }
      if (!VolunteerSaveResponseSchema.safeParse(result).success) throw new Error('Profile save returned an invalid response. Please refresh to check it.');
      const refreshed = await fetch('/api/volunteers', { cache: 'no-store', signal: controller.signal });
      if (!refreshed.ok) throw new Error('Profile saved, but the directory could not be refreshed.');
      const parsed = VolunteerDirectorySchema.safeParse(await refreshed.json());
      if (!parsed.success) throw new Error('Profile saved, but the directory returned an invalid response.');
      if (!valid()) return;
      setDirectory(parsed.data); setDirectoryActor(actorId); setProfile(parsed.data.ownProfile ?? blank); dirty.current = false; setMessage('Profile saved.');
    } catch (error) { if (valid()) setMessage(error instanceof Error ? error.message : 'Could not save your profile.'); }
    finally { if (saveController.current === controller) { saveController.current = null; if (valid()) { setLoading(true); setSaving(false); } } }
  }
  const editable = member && !identityChanging && !busy && !saving && !loading && directoryActor === actorId;
  function edit(next: VolunteerProfileInput) { if (editable) { dirty.current = true; setProfile(next); } }
  const visibleDirectory = !identityChanging && directoryActor === actorId ? directory : null;
  const volunteers = visibleDirectory?.volunteers.filter(person => (!category || person.categories.some(item => item === category)) && (!area || person.areas.some(item => item === area)) && (!language || person.languages.some(item => item === language)));
  return <><PageHeading eyebrow={t("COMMUNITY NETWORK")} title={t("Volunteers")} description={t("Find neighbors who have chosen to share how they may be able to help.")}/>
    {message && <p role="status">{t(message)}</p>}
    {member && visibleDirectory && <section className="panel"><div className="section-heading"><div><div className="eyebrow">{t("YOUR PROFILE")}</div><h2>{t("Share with your community")}</h2><p>{t("Choose ordinary capabilities, general areas and languages. Your account name is shown. Do not share contact details or precise addresses here.")}</p></div></div>
      <form onSubmit={save}><fieldset disabled={!editable}>
        <fieldset><legend>{t("Capabilities")}</legend>{volunteerCategories.map(item => <label key={item}><input type="checkbox" checked={profile.categories.includes(item)} onChange={event => edit({ ...profile, categories: event.target.checked ? [...profile.categories, item] : profile.categories.filter(value => value !== item) })}/> {t(item)} </label>)}</fieldset>
        <fieldset><legend>{t("General areas")}</legend>{areas.map(item => <label key={item}><input type="checkbox" checked={profile.areas.includes(item)} onChange={event => edit({ ...profile, areas: event.target.checked ? [...profile.areas, item] : profile.areas.filter(value => value !== item) })}/> {t(item)} </label>)}</fieldset>
        <fieldset><legend>{t("Languages")}</legend>{volunteerLanguages.map(item => <label key={item}><input type="checkbox" checked={profile.languages.includes(item)} onChange={event => edit({ ...profile, languages: event.target.checked ? [...profile.languages, item] : profile.languages.filter(value => value !== item) })}/> {t(item)} </label>)}</fieldset>
        <p><label><input type="checkbox" checked={profile.visible} onChange={event => edit({ ...profile, visible: event.target.checked })}/> {t("Show my profile in the volunteer directory")}</label></p>
        <button className="button-primary" disabled={!editable}>{t(saving ? 'Saving…' : 'Save profile')}</button>
      </fieldset></form></section>}
    <section><div className="section-heading"><div><div className="eyebrow">{t("LOCAL DIRECTORY")}</div><h2>{t("Community volunteers")}</h2><p>{t("Profiles are self-described. Offer counts are not a guarantee of availability. Requests still use matching and mutual consent.")}</p></div></div>
      <div className="button-row"><label>{t("Capability")} <select value={category} onChange={event => setCategory(event.target.value)}><option value="">{t("All")}</option>{volunteerCategories.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label><label>{t("Area")} <select value={area} onChange={event => setArea(event.target.value)}><option value="">{t("All")}</option>{areas.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label><label>{t("Language")} <select value={language} onChange={event => setLanguage(event.target.value)}><option value="">{t("All")}</option>{volunteerLanguages.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></label></div>
      {!visibleDirectory && !message && <p>{t("Loading volunteers…")}</p>}
      {volunteers && volunteers.length === 0 && <Empty title={t("No volunteers found")}>{t("Try another filter or check back later.")}</Empty>}
      <div className="request-grid">{volunteers?.map(person => { const selectedCategory = person.categories.find(item => item === category) ?? person.categories[0]; const selectedArea = person.areas.find(item => item === area) ?? person.areas[0]; const params = new URLSearchParams(); if (selectedCategory && selectedArea) { params.set('category', selectedCategory); params.set('area', selectedArea); } const query = params.toString(); return <article className="panel" key={person.id}><h3>{person.name}</h3><p><strong>{t("Capabilities:")}</strong> {person.categories.map(t).join(', ') || t('None listed')}</p><p><strong>{t("General areas:")}</strong> {person.areas.map(t).join(', ') || t('None listed')}</p><p><strong>{t("Languages:")}</strong> {person.languages.map(t).join(', ') || t('None listed')}</p><p>{person.eligibleOfferCount ? t(person.eligibleOfferCount === 1 ? '{count} active or upcoming eligible offer' : '{count} active or upcoming eligible offers').replace('{count}', String(person.eligibleOfferCount)) : t('No active or upcoming eligible offers')}</p><a className="text-link" href={`/request${query ? `?${query}` : ''}`}>{t("Ask the network for help")}</a></article>; })}</div>
    </section></>;
}
