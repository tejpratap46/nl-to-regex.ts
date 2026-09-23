import type { RegexProvider, TranslationResult } from '../types.js';
import { dslToRegExp } from '../dslToRegExp.js';
import { parseToDsl } from './grammar/parser.js';
import { tokenize, LIT, NUMBER, type CaptureSentinel, type Token } from './grammar/tokenize.js';

export { LIT, NUMBER };

/** A position in a `CustomRule.match` array: a fixed word (matched
 * case-insensitively against the token's raw text) or a capture sentinel
 * (`LIT`/`NUMBER`). */
export type MatchSpec = string | CaptureSentinel;

export interface CustomRule {
  /** Exact, full-length sequence to match against the tokenized input — no optional/repeated tokens. */
  match: MatchSpec[];
  /** Receives the captured token text, in order, for each LIT/NUMBER position in `match`. */
  build: (captures: string[]) => string;
}

function isCaptureSentinel(spec: MatchSpec): spec is CaptureSentinel {
  return spec === LIT || spec === NUMBER;
}

/** Try to match `tokens` against `match` exactly (same length, every
 * position satisfied); returns the captured values or null. */
function tryMatch(tokens: Token[], match: MatchSpec[]): string[] | null {
  if (tokens.length !== match.length) return null;
  const captures: string[] = [];
  for (let i = 0; i < match.length; i++) {
    const spec = match[i];
    const text = tokens[i].text;
    if (isCaptureSentinel(spec)) {
      if (spec === NUMBER && !/^\d+$/.test(text)) return null;
      captures.push(text);
      continue;
    }
    if (text.toLowerCase() !== spec.toLowerCase()) return null;
  }
  return captures;
}

/**
 * The nl-to-regex dataset (824 rows) is synthetically generated from a
 * small set of English sentence templates crossed with a small set of
 * regex constructions (see the deep-regex / KB13 paper). That means the
 * *surface phrasing* is narrow and repetitive even though the dataset
 * itself is small — which makes it a much better fit for a grammar than
 * for a fine-tuned LLM.
 *
 * This provider used to be a flat array of `RegExp`-matching rules run
 * in sequence. It's now backed by a real grammar
 * (src/providers/grammar/language.jison + language.jisonlex, compiled by
 * the `jison` CLI via `npm run compile:jison`), following the same
 * approach as mbasso/natural-regex: jison is a build-time-only
 * dependency — the published package still ships zero runtime
 * dependencies, just the generated parser.
 *
 * It never guesses: if the input doesn't match the grammar,
 * `translate()` returns null so the caller can fall through to an LLM
 * provider for genuinely novel phrasing.
 *
 * Since the compiled grammar can't be extended without a rebuild,
 * `addRule()` offers a lightweight escape hatch: it reuses the SAME
 * compiled lexer (so word/quote/case handling stays consistent) to
 * tokenize input, then tries user-registered fixed-word + capture
 * sequences after the compiled grammar has had first refusal. See
 * `addRule()`'s doc comment for the matching rules.
 */
export class TemplateProvider implements RegexProvider {
  readonly name = 'template';

  private customRules: CustomRule[] = [];

  /**
   * Register a rule recognized only when the compiled grammar has no
   * answer for the input. `match` must account for the ENTIRE tokenized
   * input (no optional/partial matching) — e.g. `['contains', 'an',
   * 'emoji']` matches only "contains an emoji", not "it contains an
   * emoji" or "contains an emoji here". Fixed words are matched
   * case-insensitively against the raw token text (not jison's internal
   * token type), so you can use words the built-in grammar doesn't know
   * about at all. Use the `LIT`/`NUMBER` sentinels to capture a value
   * (`NUMBER` additionally requires the token to be all-digit).
   *
   * Rules are tried in registration order; the first match wins. Returns
   * `this` for chaining.
   */
  addRule(rule: CustomRule): this {
    this.customRules.push(rule);
    return this;
  }

  async translate(nlQuery: string): Promise<TranslationResult | null> {
    const grammarDsl = parseToDsl(nlQuery);
    const dsl = grammarDsl ?? this.tryCustomRules(nlQuery);
    if (dsl === null) return null;

    let pattern: string;
    try {
      pattern = dslToRegExp(dsl);
      // Cheap sanity check — throws if the grammar produced something
      // that isn't actually a valid regex.
      new RegExp(pattern);
    } catch {
      return null;
    }

    return {
      pattern,
      flags: '',
      source: grammarDsl !== null ? 'template:jison' : 'template:custom',
      confidence: 1,
      raw: dsl,
    };
  }

  private tryCustomRules(nlQuery: string): string | null {
    if (this.customRules.length === 0) return null;
    const tokens = tokenize(nlQuery.trim());
    if (tokens === null) return null;
    for (const rule of this.customRules) {
      const captures = tryMatch(tokens, rule.match);
      if (captures !== null) return rule.build(captures);
    }
    return null;
  }
}
