import { z } from 'zod';
import { DetailSchema, IntakePreviewSchema, SnapshotSchema } from '../domain/views';
import type { Command } from '../domain/commands';
import { SourceSchema } from '../domain/inputs';
async function readResponse(response: Response): Promise<unknown> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(body);
    throw new Error(error.success ? error.data.error : 'The request failed. Please try again.');
  }
  return body;
}
async function post(path: string, body: unknown) {
  return readResponse(await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
}
export async function fetchSnapshot(signal?: AbortSignal) { return SnapshotSchema.parse(await readResponse(await fetch('/api/state', { cache: 'no-store', signal }))); }
export async function fetchDetail(id: string, signal?: AbortSignal) { return DetailSchema.parse(await readResponse(await fetch(`/api/requests/${encodeURIComponent(id)}`, { cache: 'no-store', signal }))); }
export async function sendCommand(command: Command) { return z.object({ ok: z.boolean(), id: z.string().optional() }).parse(await post('/api/command', command)); }
export async function switchIdentity(id: string) { await post('/api/session', { id }); }
export async function analyzeIntake(text: string, source: z.infer<typeof SourceSchema>) { return IntakePreviewSchema.parse(await post('/api/intake', { text, source })); }
