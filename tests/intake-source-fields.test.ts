import { describe, expect, it } from 'vitest';
import { DeterministicIntake, IntakeService } from '../src/domain/intake';

describe('source-grounded intake details', () => {
  it.each([
    ['There are three of us who need shelter', 3],
    ['We need shelter for 3 people', 3],
    ['Two of us need a ride', 2],
    ['We need 3 blankets', null],
    ['One person cannot walk', null],
    ['Not 3 people', null],
    ['About 3 people', null],
    ['Two people here and three people there', null],
  ])('extracts only an explicit, unambiguous count from %s', async (text, expected) => {
    expect((await new DeterministicIntake().extract(text)).peopleAffected).toBe(expected);
  });

  it.each([
    ['One person cannot walk', true],
    ['I use a wheelchair', true],
    ['I do not use a wheelchair', null],
    ['I can walk', null],
    ['We need transport', null],
  ])('does not infer mobility assistance from unsupported wording: %s', async (text, expected) => {
    expect((await new DeterministicIntake().extract(text)).mobilityAssistance).toBe(expected);
  });

  it('overwrites model-provided details with source-supported values and accepts older provider output', async () => {
    const baseline = await new DeterministicIntake().extract('We need 3 blankets');
    const service = new IntakeService({ name: 'Model', extract: async () => ({ ...baseline, peopleAffected: 3, mobilityAssistance: true }) });
    expect((await service.process('We need 3 blankets')).extraction).toMatchObject({ peopleAffected: null, mobilityAssistance: null });
    const { mobilityAssistance: _omitted, ...olderOutput } = baseline;
    const oldService = new IntakeService({ name: 'Older model', extract: async () => olderOutput });
    const result = await oldService.process('There are two of us and I cannot walk');
    expect(result.provider).toBe('Older model');
    expect(result.extraction).toMatchObject({ peopleAffected: 2, mobilityAssistance: true });
  });
});
