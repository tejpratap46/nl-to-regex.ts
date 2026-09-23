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
- [Adding the LLM fallback](#adding-the-llm-fallback)
- [Extending the grammar](#extending-the-grammar)
- [Adding a rule at runtime](#adding-a-rule-at-runtime)
- [Build & test](#build--test)
- [Project structure](#project-structure)

## How it works

```
NlToRegex.translate(query)
  -> TemplateProvider   (instant, deterministic, zero runtime deps)
  -> LlmProvider        (optional, for open-ended phrasing)
```

`inclinedadarsh/gemma-3-1b-nl-to-regex` is a 1B-parameter Gemma checkpoint
fine-tuned on `inclinedadarsh/nl-to-regex` — which is itself just a CSV
export of the **deep-regex / KB13** corpus (824 rows), generated from a
small, fixed set of English sentence templates crossed with a small set
of regex constructions. Given that, an LLM is the expensive way to solve
this: you'd be shipping a >1GB model to reproduce what is, for the
templated phrasings the dataset actually contains, a lookup table.

So this library leads with a **grammar-based template engine**
(`TemplateProvider`) that covers the same phrase patterns directly and
deterministically, and falls back to a real model (`LlmProvider`) only
for phrasing the grammar doesn't recognize. Both implement the same
`RegexProvider` interface, so you can add your own (a hosted inference
endpoint, a different local model, embedding-based retrieval over the
824 examples) without touching the orchestrator.

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
can decide what to do — ask the user to rephrase, fall back to an LLM
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
| `lines with only lowercase letters` | `[a-z]*` |

**Known limitation**: `and`/`or` only chain literals *within* a single
"contains" clause (`"contains 'a' and 'b'"`), not across different clause
shapes (`"starts with 'a' and contains a digit"` isn't supported) — see
[Extending the grammar](#extending-the-grammar) for why.

## Gotchas

Two things about the underlying dataset that will silently break your
regex if you're not using `TemplateProvider`/`LlmProvider` (which already
handle both):

1. **The target strings are a small DSL, not plain regex.** `&` means
   AND, `~(X)` means NOT — e.g. `(.*a.*)&(.*b.*)` means "contains a AND
   contains b". Neither is a valid JS regex metacharacter;
   `new RegExp("(.*a.*)&(.*b.*)")` looks for a literal `&` character and
   matches almost nothing. [`src/dslToRegExp.ts`](src/dslToRegExp.ts)
   converts these into lookaheads (`(?=a)(?=b)`) / negative lookaheads
   (`(?!x)`) before you ever call `new RegExp(...)`. **Every pattern from
   either provider must go through `dslToRegExp()`** — only bypass it if
   you're hand-rolling a new provider.

2. **JS matching semantics differ from what the dataset assumes.** The
   corpus was built assuming Python's `re.match` (implicitly anchored at
   the start of the string). JS's `.test()`/`.match()` behave like
   `re.search` (matches anywhere in the string) unless you anchor
   explicitly with `^`/`$`. That means dataset targets for "starts with
   X" (`X.*`, no `^`) and "ends with X" (`.*X`, no `$`) are silently
   wrong in JS — `X.*` matches a string that merely *contains* X.
   `TemplateProvider` adds the anchors; if you route "starts with"/"ends
   with" phrasing through `LlmProvider`, the model's raw output has the
   same gap and needs the same post-processing (or just let
   `TemplateProvider` catch those phrasings first, which it will).

## Adding the LLM fallback

```ts
import { NlToRegex, TemplateProvider, LlmProvider } from 'nl-to-regex';

const translator = new NlToRegex([
  new TemplateProvider(),
  new LlmProvider({ modelPath: './models/gemma-3-1b-nl-to-regex' }),
]);

const result = await translator.translate('lines mentioning either a cat or a dog but never both');
```

`LlmProvider` needs the optional peer dependency `@huggingface/transformers`
and a local ONNX export of the model — see the conversion steps and
size/quantization trade-offs documented at the top of
[`src/providers/llmProvider.ts`](src/providers/llmProvider.ts). That
conversion needs network + Python and can't happen inside this scaffold;
do it once on your own machine, then point `modelPath` at the output
directory.

## Extending the grammar

The dataset's phrase templates (from the deep-regex paper's grammar) are
narrow enough to enumerate as a real grammar rather than a growing list
of independent regexes. To recognize a new phrasing:

1. Add/adjust tokens in
   [`src/providers/grammar/language.jisonlex`](src/providers/grammar/language.jisonlex).
2. Add a production in
   [`src/providers/grammar/language.jison`](src/providers/grammar/language.jison)
   whose semantic action returns DSL source — the same `&`/`~(...)`
   syntax `dslToRegExp.ts` already understands.
3. Run `npm run compile:jison` to regenerate the parser, then rebuild.

Alternatively, pass your own `providers` array to `NlToRegex` entirely
and skip `TemplateProvider` altogether.

**Why `and`/`or` can't chain across clause shapes**: the grammar is
LALR(1) (one token of lookahead). After `"contains 'a' and"`, the parser
would need to peek a *second* token to know whether another literal
follows (`'b'`, extending the same contains-clause) or a whole new clause
does (`starts with 'b'`) — that's outside what an LALR(1) parser can
decide, so it's intentionally out of scope rather than a bug. See the
comment at the top of `language.jison` for more.

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

## Build & test

```
npm install
npm run build          # compile:jison -> tsc -> copy:grammar
node dist/selftest.js   # runs the template provider against sample queries
```

`npm run build` runs three steps (see `package.json`):

1. `compile:jison` — grammar + lexer → `src/providers/grammar/language.generated.cjs` (via the `jison` CLI).
2. `tsc -p .`
3. `copy:grammar` — copies the generated parser into `dist/`, since `tsc` only emits compiled `.ts` files.

The generated `.cjs` file is gitignored — regenerate it any time you edit
the grammar.

## Project structure

```
src/
  index.ts                        # NlToRegex orchestrator + public exports
  types.ts                        # RegexProvider / TranslationResult
  dslToRegExp.ts                  # DSL (&, ~(...)) -> ECMAScript regex
  selftest.ts                     # sample queries run via `node dist/selftest.js`
  providers/
    templateProvider.ts           # grammar-backed provider (default, no runtime deps)
    llmProvider.ts                 # optional local-model provider
    grammar/
      language.jison               # grammar (production rules -> DSL fragments)
      language.jisonlex            # lexer (tokens)
      parser.ts                    # typed wrapper around the generated parser
      tokenize.ts                  # lexer-driven tokenizer + LIT/NUMBER sentinels, used by TemplateProvider.addRule()
      language.generated.d.ts      # ambient typing for the generated parser
      language.generated.cjs       # generated by `npm run compile:jison` (gitignored)
```

## License

MIT


