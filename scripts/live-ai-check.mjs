// Run against an isolated demo server configured for a real provider:
// AI_PROVIDER=ollama npx tsx scripts/live-ai-check.mjs http://127.0.0.1:3004
import { ExtractionSchema } from '../src/domain/intake.ts';

const expected = { ollama: 'Ollama local model', hosted: 'Hosted model' }[process.env.AI_PROVIDER];
if (!expected || !process.argv[2]) {
  console.error('Provide the application base URL and set AI_PROVIDER to ollama or hosted.');
  process.exitCode = 1;
} else {
  const base = new URL(process.argv[2]);
  const started = performance.now();
  try {
    const response = await fetch(new URL('/api/intake', base), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(75000),
      headers: { 'Content-Type': 'application/json', Origin: base.origin },
      body: JSON.stringify({ text: 'Fictional example: Two people need groceries today.', source: 'Website' }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const parsed = ExtractionSchema.safeParse(result.extraction);
    const factsMatch = parsed.success && parsed.data.categories.includes('Groceries') && parsed.data.peopleAffected === 2 && parsed.data.timing?.toLowerCase() === 'today';
    if (result.provider !== expected || result.warning !== null || !factsMatch || typeof result.previewToken !== 'string' || !result.previewToken) {
      throw new Error(`provider=${result.provider}; warningPresent=${result.warning !== null}; validExtraction=${parsed.success}; expectedFacts=${factsMatch}; previewToken=${Boolean(result.previewToken)}`);
    }
    console.log(`Live AI check passed: provider=${result.provider}; fallback=false; schema=valid; fictional facts=verified; signed preview=present; elapsed=${Math.round(performance.now() - started)}ms.`);
  } catch (error) {
    console.error(`Live AI check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  }
}
