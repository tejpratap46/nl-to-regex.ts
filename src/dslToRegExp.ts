/**
 * The regex strings in inclinedadarsh/nl-to-regex and the deep-regex / KB13 corpus
 * encode their targets in a small DSL layered on top of regex syntax:
 *
 *   - `&`  means "AND" — both sides must hold for the whole string.
 *   - `|`  means "OR"  — at least one side must hold.
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
 *   A | B       ->  (?:A|B)            (non-capturing alternation)
 *
 * This function supports arbitrary nested and combined expressions of `&`, `|`,
 * and `~(X)` with parenthesis grouping.
 */

export function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True if `s` is a single balanced `(...)` group spanning the whole string. */
function isFullyWrapped(s: string): boolean {
  if (s[0] !== '(' || s[s.length - 1] !== ')') return false;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      // closed before reaching the end => not a single spanning group
      if (depth === 0 && i !== s.length - 1) return false;
    }
  }
  return depth === 0;
}

/** Split `expr` on top-level `delim` character, respecting parenthesis depth. */
function splitTopLevel(expr: string, delim: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === delim && depth === 0) {
      parts.push(expr.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(expr.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Flatten nested AND clauses: (A & B) & C -> [A, B, C] */
function collectAndClauses(expr: string): string[] {
  let trimmed = expr.trim();
  while (isFullyWrapped(trimmed) && !trimmed.startsWith('(?')) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  const orBranches = splitTopLevel(trimmed, '|');
  if (orBranches.length > 1) {
    return [trimmed];
  }
  const andClauses = splitTopLevel(trimmed, '&');
  if (andClauses.length > 1) {
    return andClauses.flatMap(collectAndClauses);
  }
  return [trimmed];
}

/**
 * Convert a deep-regex-style DSL pattern into a valid ECMAScript regex
 * source string. Recursively compiles `&`, `|`, and `~(X)` at any nesting depth.
 * Idempotent on input that's already plain regex.
 */
export function dslToRegExp(expr: string): string {
  let trimmed = expr.trim();

  // Strip redundant outer parentheses if not a special group (?...)
  while (isFullyWrapped(trimmed) && !trimmed.startsWith('(?')) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // 1. Top-level OR (|)
  const orBranches = splitTopLevel(trimmed, '|');
  if (orBranches.length > 1) {
    const compiled = orBranches.map((b) => dslToRegExp(b));
    return `(?:${compiled.join('|')})`;
  }

  // 2. Top-level AND (&)
  const andClauses = collectAndClauses(trimmed);
  if (andClauses.length > 1) {
    const lookaheads = andClauses.slice(0, -1).map((clause) => {
      let c = clause.trim();
      while (isFullyWrapped(c) && !c.startsWith('(?')) {
        c = c.slice(1, -1).trim();
      }
      if (c.startsWith('~') && isFullyWrapped(c.slice(1))) {
        const inner = dslToRegExp(c.slice(2, -1));
        return `(?!${inner})`;
      }
      const compiled = dslToRegExp(c);
      return `(?=${compiled})`;
    }).join('');

    let last = andClauses[andClauses.length - 1].trim();
    while (isFullyWrapped(last) && !last.startsWith('(?')) {
      last = last.slice(1, -1).trim();
    }
    if (last.startsWith('~') && isFullyWrapped(last.slice(1))) {
      const inner = dslToRegExp(last.slice(2, -1));
      return `${lookaheads}(?!${inner})[\\s\\S]*`;
    }
    const compiledLast = dslToRegExp(last);
    return `${lookaheads}${compiledLast}`;
  }

  // 3. Negation ~(...)
  if (trimmed.startsWith('~') && isFullyWrapped(trimmed.slice(1))) {
    const inner = dslToRegExp(trimmed.slice(2, -1));
    return `^(?!${inner})[\\s\\S]*$`;
  }

  return trimmed;
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
