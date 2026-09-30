import type { RegexProvider, TranslateOptions, TranslationResult } from './types.js';
import { TemplateProvider } from './providers/templateProvider.js';

export type { RegexProvider, TranslateOptions, TranslationResult } from './types.js';
export { dslToRegExp, dslToCompiledRegExp, escapeForRegex } from './dslToRegExp.js';
export { TemplateProvider, LIT, NUMBER, type CustomRule, type MatchSpec } from './providers/templateProvider.js';
export {
  CLAUSES,
  getClauses,
  autocomplete,
  type ClauseCategory,
  type ClauseDefinition,
  type AutocompleteSuggestion,
  type AutocompleteContext,
  type AutocompleteResult,
  type AutocompleteOptions,
} from './clauses.js';

export class NlToRegex {
  private providers: RegexProvider[];

  constructor(providers?: RegexProvider[]) {
    // Template first: fast, deterministic, and dependency-free.
    // Additional custom providers (if supplied) get consulted if earlier ones draw a blank.
    this.providers = providers ?? [new TemplateProvider()];
  }

  addProvider(provider: RegexProvider): this {
    this.providers.push(provider);
    return this;
  }

  async translate(nlQuery: string, opts: TranslateOptions = {}): Promise<TranslationResult | null> {
    const stopOnFirstMatch = opts.stopOnFirstMatch ?? true;
    const minConfidence = opts.minConfidence ?? 0;

    let best: TranslationResult | null = null;
    for (const provider of this.providers) {
      const result = await provider.translate(nlQuery);
      if (result && result.confidence >= minConfidence) {
        if (!best || result.confidence > best.confidence) best = result;
        if (stopOnFirstMatch) return best;
      }
    }
    return best;
  }

  /** Convenience wrapper: get a compiled RegExp directly, or null if nothing matched. */
  async toRegExp(nlQuery: string, opts?: TranslateOptions): Promise<RegExp | null> {
    const result = await this.translate(nlQuery, opts);
    return result ? new RegExp(result.pattern, result.flags) : null;
  }
}

/** Convenience wrapper: template engine provider. */
export function createTemplateTranslator(): NlToRegex {
  return new NlToRegex([new TemplateProvider()]);
}
