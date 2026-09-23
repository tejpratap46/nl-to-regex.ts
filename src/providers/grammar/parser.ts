import generatedParser from './language.generated.cjs';

/**
 * Parse an English phrase (via the grammar in language.jison /
 * language.jisonlex) into DSL source (the same `&`/`~(...)` DSL that
 * dslToRegExp.ts converts into a real regex). Returns null — never
 * throws — when the input doesn't match the grammar, so callers can
 * fall through to another provider exactly as they did when the old
 * RegExp-rule engine found no match.
 */
export function parseToDsl(input: string): string | null {
  try {
    return generatedParser.parse(input.trim());
  } catch {
    return null;
  }
}
