'use client';
import { useLocale } from './locale-context';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Button, dateLabel } from './ui';
import { useNetwork } from './network-context';

const StatusSchema = z.object({ running: z.boolean(), intervalMinutes: z.number().int().min(1).max(60), nextRunAt: z.iso.datetime().nullable(), lastRunAt: z.iso.datetime().nullable(), lastError: z.string().nullable() });
type Status = z.infer<typeof StatusSchema>;

export function FollowUpRunnerStatus() {
  const { t, locale } = useLocale();
  const { state, identityChanging } = useNetwork();
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (identityChanging || state.actor.role !== 'coordinator') return;
    const controller = new AbortController();
    setStatus(null); setError('');
    void (async () => {
      try {
        const response = await fetch('/api/follow-ups/status', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Could not read automatic follow-up status.');
        const result = StatusSchema.parse(await response.json());
        if (!controller.signal.aborted) setStatus(result);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not read status.');
      }
    })();
    return () => controller.abort();
  }, [state.actor.id, state.actor.role, identityChanging, revision]);
  return <section className="surface stack"><h2>{t("Automatic follow-up")}</h2><p>{t("While this server is running, it checks for stalled help and sends private in-app reminders. It never confirms outcomes or assigns helpers automatically.")}</p>{status ? <><p><strong>{status.running ? t("Running") : t("Stopped")}</strong> · {t("Every")} {status.intervalMinutes} {t(status.intervalMinutes === 1 ? "minute" : "minutes")}</p><p>{t("Last check:")} {status.lastRunAt ? dateLabel(status.lastRunAt, locale) : t("Waiting for the first check")}<br />{t("Next check:")} {status.nextRunAt ? dateLabel(status.nextRunAt, locale) : t("Not scheduled")}</p>{status.lastError && <p role="alert">{t(status.lastError)}</p>}</> : <p role="status">{t(error || 'Loading runner status…')}</p>}<p>{state.settings.clockMode === 'demo' ? t("This demo uses the simulated clock; advance it to make conditions due.") : t("Checks use the current server time.")} {t("External messages are not sent.")}</p><Button type="button" secondary disabled={identityChanging} onClick={() => setRevision(value => value + 1)}>{t("Refresh runner status")}</Button></section>;
}
