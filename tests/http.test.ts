import { expect, it } from 'vitest';
import { boundedBody, errorResponse, sameOrigin } from '../src/server/http';

it('rejects cross-origin and oversized mutations with uncached error responses', async () => {
  const crossOrigin = new Request('http://localhost/api/command', { method: 'POST', headers: { origin: 'http://elsewhere', 'content-type': 'application/json' }, body: '{}' });
  try { sameOrigin(crossOrigin); throw new Error('expected rejection'); } catch (error) {
    const response = errorResponse(error);
    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toContain('no-store');
  }
  const withinLimit = new Request('http://localhost/api/command', { method: 'POST', body: JSON.stringify({ data: 'x'.repeat(60000) }) });
  expect(await boundedBody(withinLimit)).toHaveProperty('data');
  const large = new Request('http://localhost/api/command', { method: 'POST', body: 'x'.repeat(65537) });
  await expect(boundedBody(large)).rejects.toThrow('too large');
});

it('accepts the browser origin for the incoming host when the framework uses an internal hostname', () => {
  const request = new Request('http://localhost:3000/api/command', { method: 'POST', headers: { Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000', 'Content-Type': 'application/json' }, body: '{}' });
  expect(() => sameOrigin(request)).not.toThrow();
  const crossOrigin = new Request('http://localhost:3000/api/command', { method: 'POST', headers: { Host: '127.0.0.1:3000', Origin: 'http://attacker.example', 'Content-Type': 'application/json' }, body: '{}' });
  expect(() => sameOrigin(crossOrigin)).toThrow();
});
