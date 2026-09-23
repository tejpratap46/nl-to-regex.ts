import generatedParser from './language.generated.cjs';

/**
 * Sentinel used in a TemplateProvider.addRule() `match` array to mark a
 * position whose token text should be captured rather than matched
 * literally. `NUMBER` additionally rejects tokens that aren't all-digit.
 */
export interface CaptureSentinel {
  readonly kind: 'lit' | 'number';
}

export const LIT: CaptureSentinel = { kind: 'lit' };
export const NUMBER: CaptureSentinel = { kind: 'number' };

export interface Token {
  text: string;
}

/**
 * Tokenize `input` using the SAME lexer the compiled grammar uses
 * (bundled inside language.generated.cjs), so rules registered via
 * TemplateProvider.addRule() see exactly the same words/quoting/casing
 * behavior as the built-in grammar — no separate tokenizer to keep in
 * sync. Returns null (never throws) if the lexer can't tokenize the
 * input (e.g. an unrecognized character).
 */
export function tokenize(input: string): Token[] | null {
  const lexer = generatedParser.lexer;
  if (!lexer || typeof lexer.setInput !== 'function' || typeof lexer.lex !== 'function') {
    throw new Error(
      "TemplateProvider.addRule() requires the generated parser's `.lexer` " +
        '(setInput()/lex()/yytext) — this usually means language.generated.cjs ' +
        'is stale or was produced by an incompatible jison version. Regenerate it ' +
        'with `npm run compile:jison`.',
    );
  }

  lexer.setInput(input);
  const tokens: Token[] = [];
  for (;;) {
    let type: string;
    try {
      type = lexer.lex();
    } catch {
      return null;
    }
    if (!type || type === 'EOF') break;
    if (type === 'INVALID') return null;
    tokens.push({ text: String(lexer.yytext) });
  }
  return tokens;
}
