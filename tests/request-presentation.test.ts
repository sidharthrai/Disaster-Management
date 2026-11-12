import { describe, expect, it } from 'vitest';
import { safeTitle, publicSummary } from '../src/domain/safety';
import { localizedRequestTitle, localizedRequestSummary } from '../src/lib/request-presentation';
import { translate } from '../src/lib/translations';
import type { Category } from '../src/domain/model';

const es = (key: string) => translate('es', key);
const en = (key: string) => translate('en', key);
function request(categories: Category[]) {
  return { title: safeTitle(categories), summary: publicSummary(categories), needs: categories.map(category => ({ category })) };
}

describe('request presentation', () => {
  it('localizes generated titles and summaries while preserving English output', () => {
    const item = request(['Groceries', 'Transport']);
    expect(localizedRequestTitle(item, es)).toBe('Ayuda con comestibles y transporte');
    expect(localizedRequestSummary(item, es)).toBe('Un vecino busca ayuda con comestibles y transporte. Conecta para coordinar los detalles en privado.');
    expect(localizedRequestTitle(item, en)).toBe(item.title);
    expect(localizedRequestSummary(item, en)).toBe(item.summary);
  });
  it('does not translate custom text or summaries that differ from the generated content', () => {
    const item = { ...request(['Groceries']), title: 'Help with groceries for Sam', summary: 'Call Ana about groceries.' };
    expect(localizedRequestTitle(item, es)).toBe(item.title);
    expect(localizedRequestSummary(item, es)).toBe(item.summary);
  });
  it('handles restricted and empty categories without exposing sensitive needs in summaries', () => {
    const item = request(['Medical', 'Groceries']);
    expect(localizedRequestTitle(item, es)).toBe('Ayuda con atención médica y comestibles');
    expect(localizedRequestSummary(item, es)).toBe('Un vecino busca ayuda con comestibles. Conecta para coordinar los detalles en privado.');
    const empty = request([]);
    expect(localizedRequestTitle(empty, es)).toBe('Ayuda comunitaria');
    expect(localizedRequestSummary(empty, es)).toBe('Una solicitud privada espera revisión autorizada de coordinación.');
  });
});
