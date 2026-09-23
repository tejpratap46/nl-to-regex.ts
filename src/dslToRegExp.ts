/**
 * IMPORTANT, non-obvious thing about this dataset/model:
 *
 * The regex strings in inclinedadarsh/nl-to-regex (and therefore whatever
 * gemma-3-1b-nl-to-regex was fine-tuned to emit) are NOT plain ECMAScript
 * regex. They come from the deep-regex / KB13 corpus, which encodes its
 * targets in a small DSL layered on top of regex syntax:
 *
 *   - `&`  means "AND" — both sides must hold for the whole string.
 *   - `~(X)` means "NOT" — X must not hold.
 *
 * Neither `&` nor `~` are valid regex metacharacters in JS (they'd just be
 * matched as literal characters), so `new RegExp("(.*a.*)&(.*b.*)")` will
 * NOT do what the dataset intends — it will look for a literal "&" in the
 * string. You MUST run every pattern this library produces through
 * `dslToRegExp()` before constructing a RegExp with it.
 *
 * The conversion:
 *   A & B & C   ->  (?=A)(?=B)C        (all but the last clause become
 *                                       zero-width lookaheads; the last
 *                                       clause does the actual consuming)
 *   ~(X)        ->  (?!X)              (negative lookahead)
 *
 * This is a single-level (non-recursive) top-level splitter. Every example
 * in the dataset only nests `&`/`~` one level deep, so this covers the
 * dataset and the model's likely output distribution. If you feed it
 * something with deeper nesting it will fall back to returning the
 * original string unmodified for that clause (safe, but may not be a
 * perfect translation) rather than throwing.
 */

/** Escape a literal so it's safe to splice into a regex (used by the
 * built-in grammar and available for custom TemplateProvider.addRule()
 * `build()` callbacks that need to splice a captured value in too). */
export function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Split `expr` on top-level `&` characters, respecting parenthesis depth. */
function splitTopLevelAnd(expr: string): string[] {
  const clauses: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '&' && depth === 0) {
      clauses.push(expr.slice(start, i));
      start = i + 1;
    }
  }
  clauses.push(expr.slice(start));
  return clauses.map((c) => c.trim()).filter((c) => c.length > 0);
}

/** True if `s` is a single balanced `(...)` group spanning the whole string. */
function isFullyWrapped(s: string): boolean {
  if (s[0] !== '(' || s[s.length - 1] !== ')') return false;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      // closed before reaching the end => not a single spanning group
      if (depth === 0 && i !== s.length - 1) return false;
    }
  }
  return depth === 0;
}

/** Convert one clause into either a lookahead (if not the consuming clause) or a plain fragment. */
function clauseToLookahead(clause: string): string {
  if (clause.startsWith('~') && isFullyWrapped(clause.slice(1))) {
    const inner = clause.slice(2, -1); // strip leading '~(' and trailing ')'
    return `(?!${inner})`;
  }
  if (isFullyWrapped(clause)) {
    const inner = clause.slice(1, -1);
    return `(?=${inner})`;
  }
  // Opaque fragment (may itself contain leading/trailing glue like ".*") —
  // wrap the whole thing, it's still a valid zero-width assertion.
  return `(?=${clause})`;
}

/** Convert the consuming (last) clause. Negation here still needs a lookahead + filler. */
function clauseToConsuming(clause: string): string {
  if (clause.startsWith('~') && isFullyWrapped(clause.slice(1))) {
    const inner = clause.slice(2, -1);
    return `(?!${inner})[\\s\\S]*`;
  }
  return clause;
}

/**
 * Convert a deep-regex-style DSL pattern into a valid ECMAScript regex
 * source string. Idempotent on input that's already plain regex (no `&`
 * at depth 0, no top-level `~(...)`) — safe to call on every pattern
 * whether or not you know it needed conversion.
 */
export function dslToRegExp(expr: string): string {
  const trimmed = expr.trim();
  const clauses = splitTopLevelAnd(trimmed);

  if (clauses.length === 1) {
    const only = clauses[0];
    if (only.startsWith('~') && isFullyWrapped(only.slice(1))) {
      const inner = only.slice(2, -1);
      return `^(?!${inner})[\\s\\S]*$`;
    }
    return only;
  }

  const last = clauses[clauses.length - 1];
  const lookaheads = clauses.slice(0, -1).map(clauseToLookahead).join('');
  return `${lookaheads}${clauseToConsuming(last)}`;
}

/** Convert + compile in one step, with a clear error if the result isn't a valid regex. */
export function dslToCompiledRegExp(expr: string, flags = ''): RegExp {
  const source = dslToRegExp(expr);
  try {
    return new RegExp(source, flags);
  } catch (err) {
    throw new Error(
      `dslToRegExp produced an invalid pattern from "${expr}" -> "${source}": ${(err as Error).message}`,
    );
  }
}
