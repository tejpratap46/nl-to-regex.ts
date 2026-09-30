# nl-to-regex

Translate English descriptions — `"lines that start with 'uu'"` — into
valid JavaScript `RegExp` objects.

```ts
import { createTemplateTranslator } from 'nl-to-regex';

const translator = createTemplateTranslator();
const re = await translator.toRegExp("lines that start with 'uu'");
re.test('uuzip'); // true
```

## Contents

- [How it works](#how-it-works)
- [Install](#install)
- [Usage](#usage)
- [Supported phrasings](#supported-phrasings)
- [Gotchas](#gotchas)
- [Extending the grammar](#extending-the-grammar)
- [Adding a rule at runtime](#adding-a-rule-at-runtime)
- [Autocomplete & clause APIs](#autocomplete--clause-apis)
- [Build & test](#build--test)
- [Project structure](#project-structure)

## How it works

```
NlToRegex.translate(query)
  -> TemplateProvider   (instant, deterministic, zero runtime deps)
  -> Custom providers   (optional, user-defined)
```

The **deep-regex / KB13** corpus (824 rows, also available as `inclinedadarsh/nl-to-regex`)
is generated from a small, fixed set of English sentence templates crossed
with a small set of regex constructions.

This library provides a fast, offline **grammar-based template engine**
(`TemplateProvider`) that covers these phrase patterns directly and
deterministically without heavy runtime dependencies or machine learning models.
It implements the `RegexProvider` interface, so you can easily chain your own
custom providers without touching the orchestrator.

The template engine's grammar lives in
[`src/providers/grammar/language.jison`](src/providers/grammar/language.jison)
+ [`language.jisonlex`](src/providers/grammar/language.jisonlex), compiled
at build time by the [jison](https://gerhobbelt.github.io/jison/) CLI —
the same approach [mbasso/natural-regex](https://github.com/mbasso/natural-regex)
uses. `jison` is a **devDependency only**: the published package still
ships zero runtime dependencies, just the generated parser.

## Install

```
npm install nl-to-regex
```

## Usage

```ts
import { createTemplateTranslator } from 'nl-to-regex';

const translator = createTemplateTranslator();

const result = await translator.translate("lines that start with 'uu'");
// result.pattern === '^uu.*'

const re = await translator.toRegExp("lines that contain the word 'dance'");
re.test('we dance tonight'); // true
```

`translate()` returns `null` (never throws) when nothing matches, so you
can decide what to do — ask the user to rephrase, fall back to a custom
provider, etc.

## Supported phrasings

A few examples of what `TemplateProvider` understands out of the box
(see [`language.jison`](src/providers/grammar/language.jison) for the
full grammar):

| English | Pattern |
| --- | --- |
| `lines that contain 'dance'` | `.*dance.*` |
| `lines that contain the word 'dance'` | `.*\bdance\b.*` |
| `lines that do not contain 'foo'` | `^(?!.*foo.*)[\s\S]*$` |
| `lines that start with 'uu'` | `^uu.*` |
| `lines that end with 'f'` | `.*f$` |
| `words starting with 'z'` | `.*\bz[A-Za-z]*\b.*` |
| `words ending in 'er'` | `.*\b[A-Za-z]*er\b.*` |
| `lines that contain 'a' and 'b' and 'c'` | `(?=.*a.*)(?=.*b.*)(.*c.*)` |
| `lines that contain 'x' or 'y' or 'z'` | `.*(x\|y\|z).*` |
| `lines that contain 'x' at least 3 times` | `(.*x.*){3,}` |
| `lines that contain a number` | `.*[0-9].*` |
| `lines that contain a capital letter` | `.*[A-Z].*` |
| `lines that have at least 3 digits` | `(.*[0-9].*){3,}` |
| `lines with exactly 5 digits` | `(.*[0-9].*){5}` |
| `lines with between 2 and 5 words` | `([^A-Za-z]*\b[A-Za-z]+\b[^A-Za-z]*){2,5}` |
| `lines that have all of its letters capitalized` | `^(?!.*[a-z].*)[\s\S]*$` |
| `lines with only lowercase letters` | `^[a-z]*$` |
| `lines that start with 'a' and end with 'b'` | `(?=^a.*).*b$` |
| `lines that start with 'a' or ends with 'b'` | `(?:^a.*\|.*b$)` |
| `lines using 'su' after 'son' or 'soon'` | `.*(son\|soon).*su.*` |
| `lines using 'q' before 'r'` | `.*q.*r.*` |
| `lines containing 'foo' or 'nu' before 'dist' or 'dust'` | `.*(foo\|nu).*(dist\|dust).*` |
| `lines with 'a' before 'b' and 'c' after 'd'` | `(?=.*a.*b.*).*d.*c.*` |
| `lines with 'a' and 'b'` | `(?=.*a.*).*b.*` |
| `lines with 'a' or 'b'` | `.*(a\|b).*` |
| `lines that start with 'a' and 'b' after 'c' or ends with 'd'` | `(?:(?=^a.*).*c.*b.*\|.*d$)` |
| `lines that start with 'uu' followed by words starting with 'z'` | `^uu.*\bz[A-Za-z]*\b.*` |
| `lines that have 'sandwich' but not the word 'ham'` | `(?=.*sandwich.*)(?!.*\bham\b.*)[\s\S]*` |

### Combining conditions (`and`, `or`, `after`, `before`, `with`, etc.)

Clauses and literals can be freely composed in any combination:
- **`and`**: conjunction across clauses and literals (e.g. `"starts with 'a' and ends with 'b'"`, `"contains 'a' and starts with 'b'"`)
- **`or`**: alternation across clauses and literals (e.g. `"starts with 'a' or ends with 'b'"`, `"'foo' or 'bar'"`)
- **`before` / `after` / `followed by`**: sequencing conditions (e.g. `"'a' before 'b'"`, `"'su' after 'son' or 'soon'"`, `"starts with 'uu' followed by words starting with 'z'"`)
- **`with`**: phrasing prefixes (`"lines with 'a' and 'b'"`, `"lines with exactly 5 digits"`) and connectors
- **`not` / `but not` / `without`**: negations (e.g. `"contains 'a' but not 'b'"`, `"'sandwich' but not the word 'ham'"`)
- **Grouping**: parentheses for nested expressions (e.g. `"('a' or 'b') and 'c'"`)

## Gotchas

Two things about the underlying dataset that will silently break your
regex if you're not using `TemplateProvider` (which already handles both):

1. **The target strings are a small DSL, not plain regex.** `&` means
   AND, `|` means OR, `~(X)` means NOT — e.g. `(.*a.*)&(.*b.*)` means "contains a AND
   contains b". Neither is a valid JS regex metacharacter;
   `new RegExp("(.*a.*)&(.*b.*)")` looks for a literal `&` character and
   matches almost nothing. [`src/dslToRegExp.ts`](src/dslToRegExp.ts)
   recursively converts these into lookaheads (`(?=a)(?=b)`), non-capturing groups
   (`(?:a|b)`), and negative lookaheads (`(?!x)`) before you ever call `new RegExp(...)`.
   **Every pattern from `TemplateProvider` goes through `dslToRegExp()`** — keep this in mind if
   you're hand-rolling a new provider.

2. **JS matching semantics differ from what the dataset assumes.** The
   corpus was built assuming Python's `re.match` (implicitly anchored at
   the start of the string). JS's `.test()`/`.match()` behave like
   `re.search` (matches anywhere in the string) unless you anchor
   explicitly with `^`/`$`. That means dataset targets for "starts with
   X" (`X.*`, no `^`) and "ends with X" (`.*X`, no `$`) are silently
   wrong in JS — `X.*` matches a string that merely *contains* X.
   `TemplateProvider` adds the anchors to ensure standard JavaScript regex
   matching semantics.

## Extending the grammar

The dataset's phrase templates (from the deep-regex paper's grammar) are
narrow enough to enumerate as a real grammar rather than a growing list
of independent regexes. To recognize a new phrasing:

1. Add/adjust tokens in
   [`src/providers/grammar/language.jisonlex`](src/providers/grammar/language.jisonlex).
2. Add a production in
   [`src/providers/grammar/language.jison`](src/providers/grammar/language.jison)
   whose semantic action returns DSL source — the same `&`/`|`/`~(...)`
   syntax `dslToRegExp.ts` already understands.
3. Run `npm run compile:jison` to regenerate the parser, then rebuild.

Alternatively, pass your own `providers` array to `NlToRegex` entirely
and skip `TemplateProvider` altogether.

## Adding a rule at runtime

The compiled grammar can't be extended without a rebuild (`npm run
compile:jison`). For a lighter-weight escape hatch that doesn't need a
rebuild — or a new runtime dependency — `TemplateProvider` has
`addRule()`:

```ts
import { TemplateProvider, LIT, NUMBER, escapeForRegex } from 'nl-to-regex';

const provider = new TemplateProvider();

provider.addRule({
  match: ['repeats', LIT, NUMBER, 'times'],
  build: ([word, count]) => `(.*${escapeForRegex(word)}.*){${count}}`,
});

await provider.translate('repeats foo 3 times');
// -> { pattern: '(.*foo.*){3}', source: 'template:custom', ... }
```

`addRule()` reuses the same compiled lexer the built-in grammar uses (so
quoting/casing/word-splitting behave identically), then matches your
rule's `match` array against the ENTIRE tokenized input — there's no
partial/optional matching, so `match` must describe the whole sentence.
Fixed words are compared case-insensitively against the raw token text
(you aren't limited to words the built-in grammar recognizes as
keywords); `LIT` captures any token's text, `NUMBER` captures it too but
only if it's all-digit. Custom rules are only tried after the compiled
grammar has had a chance to answer, in the order they were registered —
first match wins, and they can't override/shadow a phrase the compiled
grammar already understands. Register phrasing variants (`"repeats"` vs
`"is repeated"`) as separate `addRule()` calls rather than trying to
express alternation in one rule.

`addRule()` returns `this`, so you can chain multiple registrations —
including rules with no captures at all, or more than one `LIT`/`NUMBER`
placeholder:

```ts
provider
  .addRule({
    match: ['contains', 'an', 'emoji'],
    build: () => '[\\u{1F300}-\\u{1FAFF}]',
  })
  .addRule({
    match: ['is', LIT, 'characters', 'long'],
    build: ([count]) => `^.{${count}}$`,
  });

await provider.translate('contains an emoji');
// -> { pattern: '[\\u{1F300}-\\u{1FAFF}]', source: 'template:custom', ... }

await provider.translate('is 10 characters long');
// -> { pattern: '^.{10}$', source: 'template:custom', ... }
```

Note the second rule uses `LIT` (not `NUMBER`) for `10` — `LIT` accepts
any token text, digits included; reach for `NUMBER` only when you want
the match to fail on non-digit input at that position.

## Autocomplete & clause APIs

If you are building an interactive UI — such as a search bar, Monaco editor autocomplete, or a CLI prompt — `nl-to-regex` exports APIs to retrieve the full clause catalog and provide context-aware autocomplete suggestions as the user types (particularly after pressing space).

### Retrieving the clause catalog (`getClauses`)

Use `getClauses()` (or the frozen `CLAUSES` array) to inspect all supported natural language clauses and patterns:

```ts
import { getClauses, CLAUSES } from 'nl-to-regex';

// Get all built-in clauses
const allClauses = getClauses();

// Filter by category: 'term' | 'position' | 'content' | 'sequence' | 'count' | 'casing' | 'connector'
const terms = getClauses('term');
const positionClauses = getClauses('position');
const connectors = getClauses('connector');
```

Each `ClauseDefinition` includes:
- `id`: unique identifier (e.g. `'term_literal'`, `'starts_with_text'`, `'digit_count_at_least'`)
- `category`: clause classification (`'term' | 'position' | 'content' | 'sequence' | 'count' | 'casing' | 'connector'`)
- `label`: human-readable label (e.g. `"'...'"`, `"starts with '...'"` or `"and"`)
- `template`: template string with placeholders (e.g. `"'{text}'"`, `"starts with '{text}'"`)
- `description`: explanation of what the clause matches
- `examples`: example phrases
- `keywords`: search keywords for prefix / fuzzy matching
- `snippet`: default snippet string for editor insertion

### Context-aware autocomplete after space (`autocomplete`)

You do **not** need boilerplate prefixes like `lines that starts` — users can directly write expressions such as `'a' and 'b' after 'c'`, or `starts with 'uu'`, without boilerplate!

`autocomplete(query, options?)` inspects the input query and returns smart completions based on cursor position and grammatical context:

```ts
import { autocomplete } from 'nl-to-regex';

// 1. Initial input (or pressing space in an empty input)
autocomplete(' ');
// context: 'start'
// suggestions: direct terms ("'...'"), sequence templates ("'...' after '...'"), and clauses ("starts with '...'")

// 2. Direct bare clause flow: "'a' and 'b' after 'c'"
autocomplete("'a' ");
// context: 'after-clause'
// suggestions: connectors ("and", "after", "before", "followed by", "or", "but not")

autocomplete("'a' and ");
// context: 'after-connector'
// suggestions: direct terms ("'...'"), "the word '...'", clauses ("starts with '...'")

autocomplete("'a' and 'b' ");
// context: 'after-clause'
// suggestions: connectors ("after", "before", "followed by", "and", "or")

autocomplete("'a' and 'b' after ");
// context: 'after-connector'
// suggestions: direct terms ("'...'"), "the word '...'", "a digit", etc.

// 3. Autocomplete while typing a word
autocomplete('sta');
// filterText: 'sta'
// suggestions: filtered to matching clauses (e.g. "starts with '...'")

// 4. In-clause continuation keywords
autocomplete('starts ');
// context: 'clause-continuation'
// suggestions: "with '...'", "with a digit", "with a capital letter", "with the word '...'"
```

#### Supporting custom rules & limits

You can pass user-defined custom rules (from `TemplateProvider.addRule()`) and configure limits or category filters:

```ts
import { autocomplete, LIT, NUMBER } from 'nl-to-regex';

const result = autocomplete('repeats ', {
  customRules: [
    {
      match: ['repeats', LIT, NUMBER, 'times'],
      build: ([word, count]) => `(.*${word}.*){${count}}`,
    },
  ],
  limit: 10,
  categories: ['position', 'content', 'count'],
});

// result.suggestions includes custom rule completions alongside built-in suggestions
```

## Build & test

```
npm install
npm run build          # compile:jison -> tsc -> copy:grammar
node dist/selftest.js   # runs the template provider against sample queries
```

`npm run build` runs three steps (see `package.json`):

1. `compile:jison` — grammar + lexer → `src/providers/grammar/language.generated.js` (via the `jison` CLI + ESM post-processing).
2. `tsc -p .`
3. `copy:grammar` — copies the generated parser into `dist/`, since `tsc` only emits compiled `.ts` files.

The generated `.js` file is gitignored — regenerate it any time you edit
the grammar.

## Project structure

```
src/
  index.ts                        # NlToRegex orchestrator + public exports
  clauses.ts                      # clause catalog + context-aware autocomplete engine
  types.ts                        # RegexProvider / TranslationResult
  dslToRegExp.ts                  # DSL (&, ~(...)) -> ECMAScript regex
  selftest.ts                     # test suite with test cases & API assertions
  providers/
    templateProvider.ts           # grammar-backed provider (default, no runtime deps)
    grammar/
      language.jison               # grammar (production rules -> DSL fragments)
      language.jisonlex            # lexer (tokens)
      parser.ts                    # typed wrapper around the generated parser
      tokenize.ts                  # lexer-driven tokenizer + LIT/NUMBER sentinels, used by TemplateProvider.addRule()
      language.generated.d.ts      # ambient typing for the generated parser
      language.generated.js        # generated by `npm run compile:jison` (gitignored)
```

## License

MIT


