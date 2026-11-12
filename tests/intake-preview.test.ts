import { describe, expect, it } from 'vitest';
import { IntakeService } from '../src/domain/intake';
import { createPreviewToken, verifyCreatePreview } from '../src/server/intake-preview';
import { NetworkService } from '../src/domain/network';
import { SqliteRepository } from '../src/server/repository';
import { seedState } from '../src/domain/seed';
import { RequestSchema } from '../src/domain/model';

const input = { text: 'Need groceries tomorrow in Central Park', source: 'Website' as const, categories: ['Groceries' as const], area: 'Central Park' as const, windowStart: '2026-11-11T18:00:00.000Z', windowEnd: '2026-11-11T22:00:00.000Z', urgency: 'Urgent' as const, timingConfirmed: true };

describe('signed intake review', () => {
  it('binds a preview to actor, trimmed text, source and wall-clock expiry', async () => {
    const result = await new IntakeService().process(input.text);
    const token = createPreviewToken('u-mira', input.text, input.source, result, 1000);
    const reviewed = { ...input, previewToken: token };
    expect(verifyCreatePreview('u-mira', reviewed, 1001).result).toEqual(result);
    for (const [actor, changed] of [['u-eli', reviewed], ['u-mira', { ...reviewed, text: input.text + '!' }], ['u-mira', { ...reviewed, source: 'Phone transcript' as const }], ['u-mira', { ...reviewed, previewToken: token + 'x' }], ['u-mira', { ...reviewed, previewToken: undefined }], ['u-mira', { ...reviewed, timingConfirmed: false }], ['u-mira', { ...reviewed, urgency: undefined }]] as const) {
      expect(() => verifyCreatePreview(actor, changed, 1001)).toThrow();
    }
    expect(() => verifyCreatePreview('u-mira', reviewed, 1000 + 31 * 60 * 1000)).toThrow();
  });
  it('persists reviewed urgency and private provider flags without leaking provenance', async () => {
    const repository = new SqliteRepository(':memory:');
    try {
      repository.replace(seedState());
      const baseline = await new IntakeService().process(input.text);
      const result = { ...baseline, extraction: { ...baseline.extraction, safetyFlags: ['provider-only'], urgency: 'Critical review' as const } };
      const token = createPreviewToken('u-mira', input.text, input.source, result);
      const reviewed = { ...input, previewToken: token };
      const network = new NetworkService(repository);
      const id = network.createRequest('u-mira', reviewed, verifyCreatePreview('u-mira', reviewed));
      const saved = repository.read().requests.find(request => request.id === id);
      expect(saved?.urgency).toBe('Critical review');
      expect(saved?.safetyFlags).toContain('provider-only');
      expect(saved?.intakeProvenance?.selectedUrgency).toBe('Urgent');
      expect(() => network.detail('u-eli', id)).toThrow();
      expect(JSON.stringify(network.snapshot('u-mira').requests)).not.toContain('provider-only');
      expect(JSON.stringify(network.detail('u-mira', id).request)).not.toContain('intakeProvenance');
      const cleanToken = createPreviewToken('u-mira', input.text, input.source, baseline);
      const clean = { ...input, previewToken: cleanToken };
      const cleanId = network.createRequest('u-mira', clean, verifyCreatePreview('u-mira', clean));
      expect(repository.read().requests.find(request => request.id === cleanId)?.urgency).toBe('Urgent');
    } finally { repository.close(); }
  });
});

it('defaults old request records to no intake provenance', () => {
  const legacy = seedState();
  const request = legacy.requests[0];
  expect(request).toBeDefined();
  const { intakeProvenance: _old, ...oldRequest } = request!;
  const parsed = RequestSchema.parse(oldRequest);
  expect(parsed.intakeProvenance).toBeNull();
});
