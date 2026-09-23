import { createTemplateTranslator, TemplateProvider, LIT, NUMBER, escapeForRegex } from './index.js';

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

if (pass !== cases.length || addRulePass !== addRuleTotal) process.exitCode = 1;

