'use client';
import { useLocale } from './locale-context';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Buildings, ArrowSquareOut } from '@phosphor-icons/react';
import { areas, categories } from '@/domain/model';
import { OrganizationDirectorySchema, OrganizationSaveResponseSchema, type OrganizationDirectory } from '@/domain/organizations';
import { useNetwork } from './network-context';
import { Badge, Empty, PageHeading } from './ui';

type Directory = OrganizationDirectory;
type Profile = NonNullable<Directory['organizations'][number]['profile']>;
const blank: Profile = { about: '', services: [], serviceAreas: [], website: '' };
export function Organizations() {
  const { t } = useLocale();
  const { state, revision, busy, identityChanging } = useNetwork();
  const actorId = state.actor.id;
  const organization = state.actor.role === 'organization';
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [directoryActor, setDirectoryActor] = useState('');
  const [profile, setProfile] = useState<Profile>(blank);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const dirty = useRef(false);
  const saveController = useRef<AbortController | null>(null);
  const current = useRef({ actorId, organization, identityChanging, busy });
  current.current = { actorId, organization, identityChanging, busy };
  useEffect(() => {
    dirty.current = false; setDirectory(null); setDirectoryActor(''); setProfile(blank); setMessage(''); setSaving(false);
    return () => { saveController.current?.abort(); saveController.current = null; };
  }, [actorId, organization, identityChanging]);
  useEffect(() => {
    if (identityChanging || saving) return;
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/organizations', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Could not load organizations.');
      const parsed = OrganizationDirectorySchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('Organizations returned an invalid response. Please try again.');
      return parsed.data;
    }).then(data => {
      if (controller.signal.aborted || current.current.actorId !== actorId || current.current.identityChanging || current.current.organization !== organization) return;
      setDirectory(data); setDirectoryActor(actorId);
      if (!dirty.current) setProfile(data.organizations.find(item => item.id === actorId)?.profile ?? blank);
    }).catch(error => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Could not load organizations.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [actorId, organization, identityChanging, revision, saving]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || identityChanging || busy || saving || loading || directoryActor !== actorId || saveController.current) return;
    const controller = new AbortController(); saveController.current = controller;
    const valid = () => !controller.signal.aborted && current.current.actorId === actorId && current.current.organization && !current.current.identityChanging;
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/organizations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile), signal: controller.signal });
      const result: unknown = await response.json();
      if (!response.ok) {
        const error = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string' ? result.error : 'Could not save your profile.';
        throw new Error(error);
      }
      if (!OrganizationSaveResponseSchema.safeParse(result).success) throw new Error('Profile save returned an invalid response. Please refresh to check it.');
      const refreshed = await fetch('/api/organizations', { cache: 'no-store', signal: controller.signal });
      if (!refreshed.ok) throw new Error('Profile saved, but the directory could not be refreshed.');
      const parsed = OrganizationDirectorySchema.safeParse(await refreshed.json());
      if (!parsed.success) throw new Error('Profile saved, but the directory returned an invalid response.');
      if (!valid()) return;
      setDirectory(parsed.data); setDirectoryActor(actorId);
      setProfile(parsed.data.organizations.find(item => item.id === actorId)?.profile ?? blank);
      dirty.current = false; setMessage('Profile saved.');
    } catch (error) { if (valid()) setMessage(error instanceof Error ? error.message : 'Could not save your profile.'); }
    finally { if (saveController.current === controller) { saveController.current = null; if (valid()) { setLoading(true); setSaving(false); } } }
  }
  const editable = organization && !identityChanging && !busy && !saving && !loading && directoryActor === actorId;
  function edit(next: Profile) { if (editable) { dirty.current = true; setProfile(next); } }
  const visibleDirectory = !identityChanging && directoryActor === actorId ? directory : null;
  const own = visibleDirectory?.organizations.find(item => item.id === actorId);
  const medicalAllowed = !!own?.verified && own.qualifiedCategories.includes('Medical');
  return <><PageHeading eyebrow={t("COMMUNITY PARTNERS")} title={t("Organizations")} description={t("Meet organizations in your community and learn about their self-described services and areas.")}/>
    {message && <p role="status">{t(message)}</p>}
    {organization && visibleDirectory && <section className="panel"><div className="section-heading"><div><div className="eyebrow">{t("YOUR ORGANIZATION")}</div><h2>{t("Edit your profile")}</h2><p>{t("Descriptions and services are self-described. Account verification and qualifications are managed separately.")}</p></div></div>
      <form onSubmit={save}><fieldset disabled={!editable}>
        <label>{t("About")}<textarea value={profile.about} maxLength={1000} onChange={event => edit({ ...profile, about: event.target.value })}/></label>
        <fieldset><legend>{t("Services")}</legend>{categories.map(category => <label key={category}><input type="checkbox" checked={profile.services.includes(category)} disabled={category === 'Missing person' || (category === 'Medical' && !medicalAllowed && !profile.services.includes(category))} onChange={event => edit({ ...profile, services: event.target.checked ? [...profile.services, category] : profile.services.filter(item => item !== category) })}/> {t(category)}</label>)}<p>{t("Medical services require existing verification and qualification. Missing-person services cannot currently be advertised.")}</p></fieldset>
        <fieldset><legend>{t("General service areas")}</legend>{areas.map(area => <label key={area}><input type="checkbox" checked={profile.serviceAreas.includes(area)} onChange={event => edit({ ...profile, serviceAreas: event.target.checked ? [...profile.serviceAreas, area] : profile.serviceAreas.filter(item => item !== area) })}/> {area}</label>)}</fieldset>
        <label>{t("Website (optional HTTPS URL)")}<input type="url" maxLength={2048} value={profile.website} onChange={event => edit({ ...profile, website: event.target.value })} placeholder="https://example.org"/></label>
        <button className="button-primary" disabled={!editable}>{saving ? t("Saving…") : t("Save profile")}</button>
      </fieldset></form></section>}
    <section><div className="section-heading"><div><div className="eyebrow">{t("LOCAL DIRECTORY")}</div><h2>{t("Community organizations")}</h2><p>{t("Services and areas are self-described and do not establish eligibility.")}</p></div></div>
      {!visibleDirectory && !message && <p>{t("Loading organizations…")}</p>}
      {visibleDirectory && visibleDirectory.organizations.length === 0 && <Empty title={t("No organizations yet")}>{t("Organizations will appear here when they join your community.")}</Empty>}
      <div className="request-grid">{visibleDirectory?.organizations.map(org => <article className="panel" key={org.id}><Buildings size={24}/><h3>{org.name}</h3><div className="button-row"><Badge>{org.verified ? t("Verified account") : t("Not verified")}</Badge>{org.synthetic && <Badge>{t("Fictional demo account")}</Badge>}</div><p>{org.profile?.about || t('No description provided.')}</p><p><strong>{t("Self-described services:")}</strong> {org.profile?.services.map(t).join(', ') || t('None listed')}</p><p><strong>{t("Service areas:")}</strong> {org.profile?.serviceAreas.join(', ') || t('None listed')}</p><p><strong>{t("Account qualifications:")}</strong> {org.qualifiedCategories.length ? org.qualifiedCategories.map(t).join(', ') : t("None recorded")}</p>{org.profile?.website && <a className="text-link" href={org.profile.website} target="_blank" rel="noopener noreferrer">{t("Visit website")} <ArrowSquareOut size={16}/></a>}</article>)}</div>
    </section></>;
}
