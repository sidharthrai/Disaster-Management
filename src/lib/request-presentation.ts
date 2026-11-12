import type { Category } from '../domain/model';
import { publicSummary, safeTitle } from '../domain/safety';

type RequestText = { title: string; summary: string; needs: ReadonlyArray<{ category: Category }> };
type Translate = (key: string) => string;

export function localizedRequestTitle(request: RequestText, t: Translate): string {
  const categories = request.needs.map(need => need.category);
  if (request.title !== safeTitle(categories)) return request.title;
  if (!categories.length) return t('Community assistance');
  return t('Help with {categories}').replace('{categories}', categories.map(category => t(category).toLowerCase()).join(t(' & ')));
}

export function localizedRequestSummary(request: RequestText, t: Translate): string {
  const categories = request.needs.map(need => need.category);
  if (request.summary !== publicSummary(categories)) return request.summary;
  const safe = categories.filter(category => category !== 'Medical' && category !== 'Missing person');
  if (!safe.length) return t('A private request is awaiting authorized coordinator review.');
  return t('A neighbor is looking for help with {categories}. Connect to coordinate the details privately.')
    .replace('{categories}', safe.map(category => t(category).toLowerCase()).join(t(' and ')));
}
