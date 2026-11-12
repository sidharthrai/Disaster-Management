import { z } from 'zod';
import { areas, CategorySchema } from './model';
import { normalizeForMatching, safetyFlags } from './safety';

export const ExtractionSchema = z.strictObject({
  categories: z.array(CategorySchema).min(1).max(7),
  summary: z.string().min(1).max(600), area: z.enum(areas).nullable(), timing: z.string().max(160).nullable(),
  peopleAffected: z.number().int().positive().max(10000).nullable(),
  mobilityAssistance: z.boolean().nullable().default(null),
  urgency: z.enum(['Routine', 'Time sensitive', 'Urgent', 'Critical review']),
  urgencyReason: z.string().max(300), missingInformation: z.array(z.string().max(160)).max(10),
  safetyFlags: z.array(z.string().max(60)).max(12), nextAction: z.string().max(300),
});
export type Extraction = z.infer<typeof ExtractionSchema>;
export interface IntakeProvider { readonly name: string; extract(text: string): Promise<unknown> }

function sourcePeopleCount(text: string): number | null {
  const numbers: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const matches = [...text.matchAll(/\b(\d{1,5}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:of\s+us|people|persons|personas?)\b/gi)];
  const counts = matches.map(match => {
    const prefix = normalizeForMatching(text.slice(Math.max(0, (match.index ?? 0) - 24), match.index));
    if (/\b(?:not|no|about|around|approximately|over|under|more than|less than|at least|up to|aproximadamente|alrededor de|cerca de|mas de|menos de|al menos|hasta)\s*$/.test(prefix)) return null;
    const token = match[1] ?? '';
    const value = numbers[token.toLowerCase()] ?? Number(token);
    return value > 0 && value <= 10000 ? value : null;
  });
  return counts.length && counts.every(value => value !== null && value === counts[0]) ? counts[0] ?? null : null;
}

function sourceMobilityAssistance(text: string): boolean | null {
  const clauses = text.split(/[.!?;\n]/);
  return clauses.some(clause => {
    const normalized = normalizeForMatching(clause);
    if (/\bno puede caminar\b/.test(normalized)) return true;
    if (/\b(?:no|nunca)\s+(?:necesita|usa|utiliza)\s+(?:una?\s+)?silla de ruedas\b/.test(normalized)) return false;
    if (/\b(?:necesita|usa|utiliza)\s+(?:una?\s+)?silla de ruedas\b/.test(normalized)) return true;
    if (/\b(?:not|never|doesn['’]t|do not|don['’]t|no longer)\b/i.test(clause)) return false;
    return /\b(?:cannot|can['’]t|unable to)\s+walk\b/i.test(clause) || /\b(?:use[sd]?|using|in|need[sd]?)\s+(?:a\s+|their\s+|my\s+)?wheelchair\b/i.test(clause);
  }) ? true : null;
}
export class DeterministicIntake implements IntakeProvider {
  readonly name = 'Deterministic fallback';
  async extract(text: string): Promise<Extraction> {
    const categories: Extraction['categories'] = [];
    const normalized = normalizeForMatching(text);
    const rules: [Extraction['categories'][number], RegExp][] = [
      ['Groceries', /grocer|food|meal|shopping/i], ['Transport', /transport|ride|car\b|drive|lift|evacuat/i],
      ['Supplies', /water|suppl|cloth|blanket|battery|batteries|donat/i], ['Shelter', /shelter|accommodation|somewhere.*stay/i],
      ['Medical', /medic|insulin|prescription|injur|bleed|unconscious|hospital|surgery/i], ['Missing person', /missing|lost child|cannot find|can't find|unaccounted/i],
    ];
    const spanishRules: [Extraction['categories'][number], RegExp][] = [
      ['Groceries', /\b(?:comida|alimentos|viveres|despensa)\b/], ['Transport', /\b(?:transporte|traslado|traslados)\b/],
      ['Supplies', /\b(?:suministros?|insumos?)\b/], ['Shelter', /\b(?:refugio|albergue)\b/], ['Community', /\b(?:comunidad|vecinos?)\b/],
    ];
    for (const [category, rule] of rules) if (rule.test(text)) categories.push(category);
    for (const [category, rule] of spanishRules) if (rule.test(normalized) && !categories.includes(category)) categories.push(category);
    const flags = safetyFlags(text);
    if (flags.includes('medical') && !categories.includes('Medical')) categories.push('Medical');
    if (flags.includes('missing_person') && !categories.includes('Missing person')) categories.push('Missing person');
    if (!categories.length) categories.push('Community');
    const area = areas.find(value => text.toLowerCase().includes(value.toLowerCase())) ?? null;
    const timing = text.match(/\b(today|tomorrow|this afternoon|this evening|weekend|saturday|sunday|hoy|ma[ñn]ana|esta semana)\b/i)?.[0] ?? null;
    const urgent = flags.length > 0;
    return { categories, summary: text.slice(0, 600), area, timing, peopleAffected: sourcePeopleCount(text), mobilityAssistance: sourceMobilityAssistance(text),
      urgency: urgent ? 'Critical review' : /urgent|asap/i.test(normalized) ? 'Urgent' : timing ? 'Time sensitive' : 'Routine',
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
      extraction.peopleAffected = baseline.peopleAffected;
      extraction.mobilityAssistance = baseline.mobilityAssistance;
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
