import { describe, expect, it } from 'vitest';
import { DeterministicIntake, IntakeService } from '../src/domain/intake';
import { safetyFlags } from '../src/domain/safety';

describe('Spanish source-grounded intake', () => {
  it('recognizes ordinary needs and preserves the original text and timing', async () => {
    const text = 'Necesitamos víveres, transporte, insumos, albergue y apoyo de vecinos mañana para 3 personas.';
    const result = await new DeterministicIntake().extract(text);
    expect(result.categories).toEqual(expect.arrayContaining(['Groceries', 'Transport', 'Supplies', 'Shelter', 'Community']));
    expect(result).toMatchObject({ summary: text, timing: 'mañana', peopleAffected: 3, mobilityAssistance: null });
    expect((await new DeterministicIntake().extract('Necesito comida y traslado hoy')).timing).toBe('hoy');
    expect((await new DeterministicIntake().extract('Necesito refugio esta semana')).timing).toBe('esta semana');
  });

  it('retains independent safety flags even if a provider omits them', async () => {
    const text = 'Una persona desaparecida y herida necesita atención médica en una inundación.';
    const baseline = await new DeterministicIntake().extract(text);
    const service = new IntakeService({ name: 'Model', extract: async () => ({ ...baseline, safetyFlags: [], urgency: 'Routine' }) });
    const { extraction } = await service.process(text);
    expect(extraction.safetyFlags).toEqual(expect.arrayContaining(['medical', 'missing_person', 'danger']));
    expect(extraction.categories).toEqual(expect.arrayContaining(['Medical', 'Missing person']));
    expect(extraction.urgency).toBe('Critical review');
    expect(safetyFlags('Hay violencia y peligro inmediato')).toEqual(expect.arrayContaining(['sensitive', 'danger']));
  });

  it('distinguishes explicit people counts and mobility from quantities or guesses', async () => {
    const extract = (text: string) => new DeterministicIntake().extract(text);
    expect(await extract('Comida para 3 personas, necesita una silla de ruedas')).toMatchObject({ peopleAffected: 3, mobilityAssistance: true });
    expect(await extract('Necesita comida, no puede caminar')).toMatchObject({ mobilityAssistance: true });
    expect(await extract('Necesito 3 mantas, no necesita silla de ruedas')).toMatchObject({ peopleAffected: null, mobilityAssistance: null, timing: null });
    expect((await extract('Comida para aproximadamente 3 personas')).peopleAffected).toBeNull();
    expect((await extract('Comida para 2 personas y 3 personas')).peopleAffected).toBeNull();
  });
});
