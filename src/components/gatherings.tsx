'use client';
import { useLocale } from './locale-context';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { areas, GatheringSchema } from '@/domain/model';
import { GatheringCommandSchema, GatheringMutationResponseSchema, GatheringsProjectionSchema, type GatheringsProjection } from '@/domain/gatherings';
import { useNetwork } from './network-context';
import { Badge, Button, Empty, PageHeading, dateLabel } from './ui';

type Command = z.infer<typeof GatheringCommandSchema>;
export function Gatherings() { const { t, locale } = useLocale();
  const { state, revision, busy, identityChanging } = useNetwork();
  const actorId = state.actor.id;
  const [kind, setKind] = useState<z.infer<typeof GatheringSchema.shape.kind>>('Neighborhood clean-up');
  const [area, setArea] = useState<z.infer<typeof GatheringSchema.shape.area>>(areas[0]);
  const [offset, setOffset] = useState('24');
  const [duration, setDuration] = useState('2');
  const [capacity, setCapacity] = useState('10');
  const [notes, setNotes] = useState('');
  const [loaded, setLoaded] = useState<{ actor: string; data: GatheringsProjection } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const pending = useRef<AbortController | null>(null);
  const current = useRef({ actorId, identityChanging, busy });
  current.current = { actorId, identityChanging, busy };
  useEffect(() => {
    setLoaded(null); setMessage(''); setNotes(''); setKind('Neighborhood clean-up'); setArea(areas[0]); setOffset('24'); setDuration('2'); setCapacity('10'); setSaving(false);
    return () => { pending.current?.abort(); pending.current = null; };
  }, [actorId, identityChanging]);
  useEffect(() => {
    if (identityChanging || saving) return;
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/gatherings', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Could not load activities.');
      return GatheringsProjectionSchema.parse(await response.json());
    }).then(data => {
      if (!controller.signal.aborted && current.current.actorId === actorId && !current.current.identityChanging) setLoaded({ actor: actorId, data });
    }).catch(() => { if (!controller.signal.aborted) setMessage('Could not load activities. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [actorId, identityChanging, revision, saving, reload]);
  async function execute(command: Command) {
    if (identityChanging || busy || saving || loading || loaded?.actor !== actorId || pending.current) return false;
    const controller = new AbortController(); pending.current = controller;
    const valid = () => !controller.signal.aborted && current.current.actorId === actorId && !current.current.identityChanging;
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/gatherings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: controller.signal });
      const result: unknown = await response.json();
      if (!response.ok) {
        const error = z.object({ error: z.string() }).safeParse(result);
        throw new Error(error.success ? error.data.error : 'Could not save the activity.');
      }
      GatheringMutationResponseSchema.parse(result);
      if (!valid()) return false;
      setMessage(command.action === 'create' ? 'Activity created. Join it if you plan to attend.' : 'Activity updated.');
      setReload(value => value + 1);
      return true;
    } catch (error) { if (valid()) setMessage(error instanceof Error ? error.message : 'Could not save the activity.'); return false; }
    finally { if (pending.current === controller) { pending.current = null; if (valid()) setSaving(false); } }
  }
  const startAt = new Date(Date.parse(state.settings.now) + Number(offset) * 3600000).toISOString();
  const endAt = new Date(Date.parse(startAt) + Number(duration) * 3600000).toISOString();
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await execute({ action: 'create', input: { kind, area, startAt, endAt, capacity: Number(capacity), notes } })) setNotes('');
  }
  const enabled = !busy && !identityChanging && !saving && !loading && loaded?.actor === actorId;
  const items = !identityChanging && loaded?.actor === actorId ? loaded.data.gatherings : null;
  return <><PageHeading eyebrow={t("YOUR COMMUNITY")} title={t("Group activities")} description={t("Plan and join ordinary neighborhood activities together.")} />
    <div className="content-with-aside"><form className="surface stack" onSubmit={create}><h2>{t("Plan an activity")}</h2>
      <p>{t("Organizers are not automatically enrolled. Join your activity to count toward capacity.")}</p>
      <fieldset disabled={!enabled} className="stack">
        <div className="field"><label htmlFor="g-kind">{t("Activity")}</label><select id="g-kind" value={kind} onChange={event => setKind(GatheringSchema.shape.kind.parse(event.target.value))}>{GatheringSchema.shape.kind.options.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></div>
        <div className="field"><label htmlFor="g-area">{t("Neighborhood")}</label><select id="g-area" value={area} onChange={event => setArea(GatheringSchema.shape.area.parse(event.target.value))}>{areas.map(value => <option key={value} value={value}>{t(value)}</option>)}</select></div>
        <div className="field"><label htmlFor="g-offset">{t(state.settings.clockMode === 'demo' ? 'Start after current demo time' : 'Start after current server time')}</label><select id="g-offset" value={offset} onChange={event => setOffset(event.target.value)}><option value="1">{t("1 hour")}</option><option value="4">{t("4 hours")}</option><option value="24">{t("1 day")}</option><option value="72">{t("3 days")}</option><option value="168">{t("7 days")}</option></select></div>
        <div className="field"><label htmlFor="g-duration">{t("Duration")}</label><select id="g-duration" value={duration} onChange={event => setDuration(event.target.value)}><option value="1">{t("1 hour")}</option><option value="2">{t("2 hours")}</option><option value="4">{t("4 hours")}</option><option value="8">{t("8 hours")}</option></select></div>
        <p>{t("Preview:")} {dateLabel(startAt, locale)} {t("to")} {dateLabel(endAt, locale)} {t("Central.")}</p>
        <div className="field"><label htmlFor="g-capacity">{t("Capacity (1–100)")}</label><input id="g-capacity" type="number" min="1" max="100" step="1" required value={capacity} onChange={event => setCapacity(event.target.value)}/></div>
        <div className="field"><label htmlFor="g-notes">{t("Private organizer notes (optional)")}</label><textarea id="g-notes" maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)}/><p>{t("Visible only to you and community coordinators.")}</p></div>
        <Button disabled={!enabled}>{t(saving ? 'Saving…' : 'Create activity')}</Button>
      </fieldset></form><aside className="rail-note"><h3>{t("Community activities")}</h3><p>{t("Activities are for ordinary community participation. They do not dispatch emergency or professional services.")}</p></aside></div>
    {message && <p role="status">{t(message)}</p>}
    <section className="block-section"><h2>{t("Activities in your community")}</h2>
      {!items ? <p role="status">{t(loading ? 'Loading activities…' : 'Activities are unavailable.')}</p> : items.length === 0 ? <Empty title={t("No activities yet")}>{t("Create an activity to get started.")}</Empty> : <div className="list">{items.map(item => <article className="list-row" key={item.id}><div>
        <h3>{t(item.kind)} {item.cancelledAt && <Badge>{t("Cancelled")}</Badge>}</h3><p>{item.area} · {dateLabel(item.startAt, locale)} {t("to")} {dateLabel(item.endAt, locale)} {t("Central")}</p><p>{item.count} {t("of")} {item.capacity} {t("joined ·")} {t(item.joined ? 'You joined' : 'You have not joined')}</p>
        {item.privateDetails && <><p><strong>{t("Private notes:")}</strong> {item.privateDetails.notes || t('None')}</p><p><strong>{t("Participants:")}</strong> {item.privateDetails.participants.join(', ') || t('None yet')}</p></>}
        <div className="button-row">{!item.cancelledAt && <><Button type="button" secondary disabled={!enabled || (!item.joined && (item.count >= item.capacity || Date.parse(item.endAt) <= Date.parse(state.settings.now)))} onClick={() => void execute({ action: item.joined ? 'leave' : 'join', id: item.id })}>{t(item.joined ? 'Leave' : 'Join')}</Button>{item.canManage && <Button type="button" secondary disabled={!enabled} onClick={() => void execute({ action: 'cancel', id: item.id })}>{t("Cancel activity")}</Button>}</>}</div>
      </div></article>)}</div>}
    </section></>;
}
