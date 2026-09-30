import {
  createTemplateTranslator,
  TemplateProvider,
  LIT,
  NUMBER,
  escapeForRegex,
  getClauses,
  autocomplete,
  CLAUSES,
} from './index.js';

// Each case: [english query, string that SHOULD match, string that SHOULD NOT match]
const cases: [string, string, string][] = [
  ["lines that contain the word 'dance'", 'we dance tonight', 'dancer tonight'],
  ["lines that start with 'uu'", 'uuzip', 'zuu'],
  ["lines that end with 'f'", 'shelf', 'shelve'],
  ["lines that do not contain the word 'foo'", 'this is bar', 'this is foo'],
  ["lines that contain 'black' and 'z'", 'black zebra', 'black cat'],
  ["lines that contain 'mix' or 'shake'", 'lets shake', 'lets stir'],
  ['lines that contain a number', 'row 42', 'no digits here'],
  ['lines that have at least 3 numbers', 'a1 b2 c3', 'a1 b2'],
  ['lines that have all of its letters capitalized', 'HELLO', 'Hello'],
  ["lines using words ending in 'er'", 'the runner arrives', 'the run arrives'],
  // Broader-coverage cases exercised by the jison grammar (see language.jison):
  ["lines that contain 'a' and 'b' and 'c'", 'a b c', 'a b'],
  ["lines that contain 'x' or 'y' or 'z'", 'has a z in it', 'has none of them'],
  ["lines that do not start with 'a'", 'banana', 'apple'],
  // Conjunctions, sequencing, and combinations (and, or, after, before, with, etc.):
  ["lines that start with 'a' and end with 'b'", 'apple pie club', 'club apple'],
  ["lines that start with 'a' or ends with 'b'", 'club', 'nothing'],
  ["lines using 'su' after 'son' or 'soon'", 'the son arrived su', 'the sun arrived su'],
  ["lines using 'q' before 'r'", 'quite right', 'right quite'],
  ["lines containing 'foo' or 'nu' before 'dist' or 'dust'", 'foo in dist', 'dist in foo'],
  ["lines with 'a' before 'b' and 'c' after 'd'", 'a ... b and d ... c', 'b ... a and d ... c'],
  ["lines with 'a' and 'b'", 'apple bee', 'apple cat'],
  ["lines with 'a' or 'b'", 'bee', 'dog'],
  ["lines with exactly 5 digits", '12345', '1234'],
  ["lines that start with 'a' and 'b' after 'c' or ends with 'd'", 'apple ... cat ... bee', 'banana'],
  ["lines that contain 'a' after 'b' and end with 'c'", 'b then a ... c', 'a then b ... c'],
  ["lines that start with 'uu' followed by words starting with 'z'", 'uu zebra', 'uu cat'],
  ["lines that have 'sandwich' but not the word 'ham'", 'sandwich cheese', 'sandwich with ham'],
];

let pass = 0;
const translator = createTemplateTranslator();

for (const [query, shouldMatch, shouldNotMatch] of cases) {
  const result = await translator.translate(query);
  if (!result) {
    console.log(`FAIL  (no match)             ${query}`);
    continue;
  }
  const re = new RegExp(result.pattern, result.flags);
  const ok = re.test(shouldMatch) && !re.test(shouldNotMatch);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${result.pattern.padEnd(45)}  ${query}`);
  if (ok) pass++;
}

console.log(`\n${pass}/${cases.length} passed`);

// --- addRule(): custom runtime rules on top of the compiled grammar ---
let addRulePass = 0;
const addRuleTotal = 2;
const custom = new TemplateProvider();
custom.addRule({
  match: ['repeats', LIT, NUMBER, 'times'],
  build: ([word, count]) => `(.*${escapeForRegex(word)}.*){${count}}`,
});

{
  // New phrasing recognized only via the custom rule.
  const result = await custom.translate('repeats foo 3 times');
  const ok = !!result && result.source === 'template:custom' && new RegExp(result.pattern).test('foofoofoo');
  console.log(`${ok ? 'ok  ' : 'FAIL'}  addRule: custom phrasing recognized`);
  if (ok) addRulePass++;
}

{
  // Built-in grammar phrasing must still work, unaffected by the custom rule.
  const result = await custom.translate("lines that contain the word 'dance'");
  const ok = !!result && result.source === 'template:jison' && new RegExp(result.pattern).test('we dance tonight');
  console.log(`${ok ? 'ok  ' : 'FAIL'}  addRule: built-in grammar still works`);
  if (ok) addRulePass++;
}

console.log(`${addRulePass}/${addRuleTotal} addRule checks passed`);

// --- getClauses() & autocomplete() API tests ---
let apiPass = 0;
const apiTotal = 9;

{
  // 1. getClauses() returns valid catalog and supports category filter
  const all = getClauses();
  const positionClauses = getClauses('position');
  const connectorClauses = getClauses('connector');
  const termClauses = getClauses('term');
  const ok =
    all.length > 20 &&
    all.every((c) => c.id && c.label && c.template && c.description && c.examples.length > 0) &&
    positionClauses.every((c) => c.category === 'position') &&
    connectorClauses.every((c) => c.category === 'connector') &&
    termClauses.some((c) => c.label === "'...'");
  console.log(`${ok ? 'ok  ' : 'FAIL'}  getClauses(): returns valid catalog and supports category filtering`);
  if (ok) apiPass++;
}

{
  // 2. autocomplete on empty input or space returns direct terms and clauses without boilerplate
  const rEmpty = autocomplete('');
  const rSpace = autocomplete(' ');
  const ok =
    rEmpty.context === 'start' &&
    rEmpty.suggestions.some((s) => s.label === "'...'") &&
    !rEmpty.suggestions.some((s) => s.category === 'prefix') &&
    rSpace.context === 'start' &&
    rSpace.suggestions.some((s) => s.label.includes('starts with'));
  console.log(`${ok ? 'ok  ' : 'FAIL'}  autocomplete(): handles empty input and initial space without boilerplate`);
  if (ok) apiPass++;
}

{
  // 3. autocomplete after prefix with space
  const r = autocomplete('lines that ');
  const ok =
    r.context === 'after-prefix' &&
    r.filterText === '' &&
    r.suggestions.some((s) => s.label === "starts with '...'") &&
    r.suggestions.some((s) => s.label === "ends with '...'");
  console.log(`${ok ? 'ok  ' : 'FAIL'}  autocomplete("lines that "): suggests clause templates after prefix`);
  if (ok) apiPass++;
}

{
  // 4. autocomplete with partial word filtering
  const r = autocomplete('lines that sta');
  const ok =
    r.filterText === 'sta' &&
    r.suggestions.length > 0 &&
    r.suggestions.every((s) => s.label.toLowerCase().includes('sta') || s.insertText.toLowerCase().includes('sta'));
  console.log(`${ok ? 'ok  ' : 'FAIL'}  autocomplete("lines that sta"): filters suggestions by partial prefix`);
  if (ok) apiPass++;
}

{
  // 5. autocomplete in-clause continuation: after "starts "
  const r = autocomplete('lines that starts ');
  const ok =
    r.context === 'clause-continuation' &&
    r.suggestions.some((s) => s.label.startsWith("with '...'"));
  console.log(`${ok ? 'ok  ' : 'FAIL'}  autocomplete("lines that starts "): suggests continuation tokens`);
  if (ok) apiPass++;
}

{
  // 6. autocomplete after completed clause with space suggests connectors
  const r = autocomplete("lines that start with 'uu' ");
  const ok =
    r.context === 'after-clause' &&
    r.suggestions.some((s) => s.label === 'and' && s.category === 'connector') &&
    r.suggestions.some((s) => s.label === 'or' && s.category === 'connector') &&
    r.suggestions.some((s) => s.label === 'but not' && s.category === 'connector');
  console.log(`${ok ? 'ok  ' : 'FAIL'}  autocomplete("... 'uu' "): suggests connectors after completed clause`);
  if (ok) apiPass++;
}

{
  // 7. autocomplete after connector with space suggests clause templates again
  const r = autocomplete("lines that start with 'uu' and ");
  const ok =
    r.context === 'after-connector' &&
    r.suggestions.some((s) => s.label === "ends with '...'");
  console.log(`${ok ? 'ok  ' : 'FAIL'}  autocomplete("... and "): suggests clauses after connector`);
  if (ok) apiPass++;
}

{
  // 8. autocomplete with custom rules and limit options
  const r = autocomplete('repeats ', {
    customRules: [
      {
        match: ['repeats', LIT, NUMBER, 'times'],
        build: ([w, c]) => `(.*${w}.*){${c}}`,
      },
    ],
    limit: 5,
  });
  const ok =
    r.suggestions.length <= 5 &&
    r.suggestions.some((s) => s.category === 'custom' && s.label.includes('repeats'));
  console.log(`${ok ? 'ok  ' : 'FAIL'}  autocomplete(): supports custom rules and result limit`);
  if (ok) apiPass++;
}

{
  // 9. direct bare clause flow without boilerplate: "'a' and 'b' after 'c'"
  const step1 = autocomplete("'a' ");
  const step2 = autocomplete("'a' and ");
  const step3 = autocomplete("'a' and 'b' ");
  const step4 = autocomplete("'a' and 'b' after ");
  const ok =
    step1.context === 'after-clause' &&
    step1.suggestions.some((s) => s.label === 'and') &&
    step2.context === 'after-connector' &&
    step2.suggestions.some((s) => s.label === "'...'") &&
    step3.context === 'after-clause' &&
    step3.suggestions.some((s) => s.label === 'after') &&
    step4.context === 'after-connector' &&
    step4.suggestions.some((s) => s.label === "'...'");
  console.log(`${ok ? 'ok  ' : 'FAIL'}  autocomplete: supports bare clause flow "'a' and 'b' after 'c'" without boilerplate`);
  if (ok) apiPass++;
}

console.log(`${apiPass}/${apiTotal} autocomplete API checks passed`);

if (pass !== cases.length || addRulePass !== addRuleTotal || apiPass !== apiTotal) {
  process.exitCode = 1;
}


