import { describe, expect, it } from 'vitest';
import { hasSpanishTranslation, translate } from '../src/lib/translations';
import { categories } from '../src/domain/model';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

describe('navigation and intake translations', () => {
  it('returns English labels unchanged and translates common Spanish labels', () => {
    expect(translate('en', 'Ask for help')).toBe('Ask for help');
    expect(translate('es', 'Ask for help')).toBe('Pedir ayuda');
    expect(translate('es', 'Describe the help needed')).toBe('Describe la ayuda necesaria');
    expect(translate('es', 'Groceries')).toBe('Comestibles');
  });

  it('covers supported localized screens', () => {
    const components = join(process.cwd(), 'src/components');
    const missing = new Set<string>();
    // The user deferred translation for the new disaster workflow, so these screens retain English fallback.
    const englishFallbackScreens = new Set(['disaster-hub.tsx', 'disaster-people.tsx', 'disaster-support.tsx']);
    for (const file of readdirSync(components).filter(name => name.endsWith('.tsx') && !englishFallbackScreens.has(name))) {
      const source = ts.createSourceFile(file, readFileSync(join(components, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments.length === 1) {
          const argument = node.arguments[0];
          if (argument && ts.isStringLiteral(argument) && !hasSpanishTranslation(argument.text)) missing.add(`${file}: ${argument.text}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect([...missing].sort()).toEqual([]);
  });

  it('includes all canonical categories in the Spanish dictionary', () => {
    expect(categories.filter(category => !hasSpanishTranslation(category))).toEqual([]);
  });

  it('falls back to the English label for an unknown key', () => {
    expect(translate('es', 'Untranslated operational label')).toBe('Untranslated operational label');
  });
});
