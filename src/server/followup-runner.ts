import type { Repository } from '../domain/store';
import { FollowUpService } from '../domain/followup';
import { repository } from './services';

type RunnerState = { timer: ReturnType<typeof setInterval> | null; intervalMinutes: number; nextRunAt: string | null; lastRunAt: string | null; lastError: string | null };
type RunnerGlobal = typeof globalThis & { communityFollowUpRunner?: RunnerState };
const globals: RunnerGlobal = globalThis;
const state = () => globals.communityFollowUpRunner ??= { timer: null, intervalMinutes: 1, nextRunAt: null, lastRunAt: null, lastError: null };

export function followUpTick(store: Repository): void {
  store.transaction(current => new FollowUpService().reconcile(current));
}

export function followUpRunnerStatus() {
  const { timer, intervalMinutes, nextRunAt, lastRunAt, lastError } = state();
  return { running: timer !== null, intervalMinutes, nextRunAt, lastRunAt, lastError };
}

export function startFollowUpRunner(): void {
  if (process.env.NEXT_PHASE === 'phase-production-build' || state().timer) return;
  const configured = Number(process.env.FOLLOW_UP_INTERVAL_MINUTES ?? '1');
  const intervalMinutes = Number.isInteger(configured) && configured >= 1 && configured <= 60 ? configured : 1;
  const runner = state();
  const interval = intervalMinutes * 60_000;
  runner.intervalMinutes = intervalMinutes;
  runner.nextRunAt = new Date(Date.now() + interval).toISOString();
  runner.timer = setInterval(() => {
    try {
      followUpTick(repository());
      runner.lastError = null;
    } catch {
      runner.lastError = 'Follow-up evaluation failed.';
    } finally {
      runner.lastRunAt = new Date().toISOString();
      runner.nextRunAt = new Date(Date.now() + interval).toISOString();
    }
  }, interval);
  runner.timer.unref();
}
