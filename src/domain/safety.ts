import type { Category } from './model';

const patterns: [string, RegExp][] = [
  ['medical', /\b(medic\w*|insulin|prescription|surgery|injur\w*|bleeding|unconscious|chest pain|cannot breathe|can't breathe|hospital|seizure|overdose)\b/i],
  ['missing_person', /\b(missing|lost child|cannot find|can't find|unaccounted|disappeared|cannot contact|can't contact)\b/i],
  ['danger', /\b(trapped|rescue|evacuat\w*|flood\w*|wildfire|earthquake|fire|drowning|immediate danger|cannot walk|can't walk)\b/i],
  ['sensitive', /\b(abuse|violence|stalk\w*|suicid\w*|self.harm|minor|child alone)\b/i],
];
export function safetyFlags(text: string): string[] {
  return patterns.filter(([, expression]) => expression.test(text)).map(([flag]) => flag);
}
export function publicSummary(categories: readonly Category[]): string {
  const safe = categories.filter(category => !['Medical', 'Missing person'].includes(category));
  return safe.length ? `A neighbor is looking for help with ${safe.map(c => c.toLowerCase()).join(' and ')}. Connect to coordinate the details privately.` : 'A private request is awaiting authorized coordinator review.';
}
export function safeTitle(categories: readonly Category[]): string {
  return categories.length ? `Help with ${categories.map(c => c.toLowerCase()).join(' & ')}` : 'Community assistance';
}
