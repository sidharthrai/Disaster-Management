import { afterEach, expect, it, vi } from 'vitest';
import { DeterministicIntake, IntakeService } from '../src/domain/intake';
import { HostedProvider, OllamaProvider } from '../src/server/providers';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each(['ollama', 'hosted'] as const)('%s adapter accepts valid output and falls back on malformed or failed responses', async kind => {
  vi.stubEnv('HOSTED_AI_API_KEY', 'test-key');
  const baseline = await new DeterministicIntake().extract('Need groceries near Riverside today');
  const body = kind === 'ollama' ? { message: { content: JSON.stringify(baseline) } } : { choices: [{ message: { content: JSON.stringify(baseline) } }] };
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(body)).mockResolvedValueOnce(Response.json({ invalid: true })).mockRejectedValueOnce(new Error('timeout'));
  vi.stubGlobal('fetch', fetchMock);
  const service = new IntakeService(kind === 'ollama' ? new OllamaProvider() : new HostedProvider());
  expect((await service.process('Need groceries near Riverside today')).warning).toBeNull();
  expect((await service.process('Need groceries near Riverside today')).provider).toBe('Deterministic fallback');
  expect((await service.process('Need groceries near Riverside today')).provider).toBe('Deterministic fallback');
});
