import { z } from 'zod';
import { areas, CategorySchema } from './model';
import { safetyFlags } from './safety';

export const ExtractionSchema = z.strictObject({
  categories: z.array(CategorySchema).min(1).max(7),
  summary: z.string().min(1).max(600), area: z.enum(areas).nullable(), timing: z.string().max(160).nullable(),
  peopleAffected: z.number().int().positive().max(10000).nullable(),
  urgency: z.enum(['Routine', 'Time sensitive', 'Urgent', 'Critical review']),
  urgencyReason: z.string().max(300), missingInformation: z.array(z.string().max(160)).max(10),
  safetyFlags: z.array(z.string().max(60)).max(12), nextAction: z.string().max(300),
});
export type Extraction = z.infer<typeof ExtractionSchema>;
export interface IntakeProvider { readonly name: string; extract(text: string): Promise<unknown> }
export class DeterministicIntake implements IntakeProvider {
  readonly name = 'Deterministic fallback';
  async extract(text: string): Promise<Extraction> {
    const categories: Extraction['categories'] = [];
    const rules: [Extraction['categories'][number], RegExp][] = [
      ['Groceries', /grocer|food|meal|shopping/i], ['Transport', /transport|ride|car\b|drive|lift|evacuat/i],
      ['Supplies', /water|suppl|cloth|blanket|battery|batteries|donat/i], ['Shelter', /shelter|accommodation|somewhere.*stay/i],
      ['Medical', /medic|insulin|prescription|injur|bleed|unconscious|hospital|surgery/i], ['Missing person', /missing|lost child|cannot find|can't find|unaccounted/i],
    ];
    for (const [category, rule] of rules) if (rule.test(text)) categories.push(category);
    if (!categories.length) categories.push('Community');
    const area = areas.find(value => text.toLowerCase().includes(value.toLowerCase())) ?? null;
    const timing = text.match(/\b(today|tomorrow|this afternoon|this evening|weekend|saturday|sunday)\b/i)?.[0] ?? null;
    const flags = safetyFlags(text);
    const urgent = flags.length > 0;
    return { categories, summary: text.slice(0, 600), area, timing, peopleAffected: null,
      urgency: urgent ? 'Critical review' : /urgent|asap/i.test(text) ? 'Urgent' : timing ? 'Time sensitive' : 'Routine',
      urgencyReason: urgent ? 'Potentially sensitive or dangerous situation; authorized review required.' : 'Based on explicit timing and urgency language only.',
      missingInformation: [...(!area ? ['General neighborhood'] : []), ...(!timing ? ['Requested timeframe'] : []), 'Private coordination details after connecting'],
      safetyFlags: flags, nextAction: urgent ? 'Keep private and request coordinator review. For immediate danger, contact local emergency services.' : 'Review the extracted details before creating a request.' };
  }
}
export class IntakeService {
  constructor(private readonly provider: IntakeProvider = new DeterministicIntake()) {}
  async process(text: string) {
    const fallback = new DeterministicIntake();
    const baseline = await fallback.extract(text);
    try {
      const extraction = ExtractionSchema.parse(await this.provider.extract(text));
      extraction.area = baseline.area;
      extraction.timing = baseline.timing;
      extraction.peopleAffected = null;
      extraction.categories = [...new Set([...baseline.categories, ...extraction.categories])];
      extraction.safetyFlags = [...new Set([...baseline.safetyFlags, ...extraction.safetyFlags])];
      if (extraction.safetyFlags.length) extraction.urgency = 'Critical review';
      extraction.missingInformation = [...new Set([...baseline.missingInformation, ...extraction.missingInformation])];
      return { extraction: ExtractionSchema.parse(extraction), provider: this.provider.name, warning: null as string | null };
    } catch {
      return { extraction: baseline, provider: fallback.name, warning: 'The configured model was unavailable or returned invalid output. Deterministic processing was used safely.' };
    }
  }
}
export type IntakeResult = Awaited<ReturnType<IntakeService['process']>>;
