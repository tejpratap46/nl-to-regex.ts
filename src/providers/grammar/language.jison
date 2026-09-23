/**
 * Grammar for translating a small, fixed subset of English phrasing (the
 * deep-regex / KB13 templates — see templateProvider.ts) into the
 * `&`/`~(...)` DSL consumed by dslToRegExp.ts. Each semantic action
 * returns a DSL-fragment string built bottom-up, exactly like the old
 * `Rule.build()` functions did — this file replaces the RegExp-matching
 * for-loop, not dslToRegExp.ts itself.
 *
 * SCOPE NOTE ON "AND"/"OR": conjunctions are only supported *within* a
 * single "contains" clause ("contains 'a' and 'b'", "contains 'a' or
 * 'b' or 'c'") — generalized here from the original hard-coded 2-literal
 * shape to N-ary. Chaining two *different* clause shapes with "and"/"or"
 * (e.g. "contains 'a' and starts with 'b'") is deliberately NOT
 * supported: the word "and" would then be ambiguous between "one more
 * literal in this contains-list" and "start of a whole new clause",
 * which is a genuine LALR(1) shift/reduce conflict (the parser would
 * need to see two tokens past "and" to know which), not just an
 * unimplemented feature. See README for details.
 */

%{
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function andJoinLiterals(lits) {
  return lits.map(function (l) { return '(.*' + esc(l) + '.*)'; }).join('&');
}

function orJoinLiterals(lits) {
  return '.*(' + lits.map(esc).join('|') + ').*';
}
%}

%start sentence

%%

sentence
  : opt_filler neg_prefix clause EOF
      { return '~(' + $3 + ')'; }
  | opt_filler clause EOF
      { return $2; }
  ;

// Sentences in this dataset are almost always phrased as "lines/strings
// that/which/using ..." — the subject + connector carries no semantic
// weight of its own, so it's consumed and discarded here rather than
// forcing every clause below to account for it.
opt_filler
  : SUBJECT THAT
  | SUBJECT CONTAINS
  | /* empty */
  ;

neg_prefix
  : DO NOT
  | DOES NOT
  | NOT
  ;

// Optional connector verb ahead of a bare count/condition clause, e.g.
// "have at least 3 digits" or "have all of its letters capitalized" —
// mirrors the optional `(?:exactly |have )?` / `(?:contains?|...)?`
// prefixes the old regex rules had for these same phrasings.
opt_verb
  : CONTAINS
  | /* empty */
  ;

clause
  : contains_clause
      { $$ = $1; }
  | starts_clause
      { $$ = $1; }
  | ends_clause
      { $$ = $1; }
  | words_starting_clause
      { $$ = $1; }
  | words_ending_clause
      { $$ = $1; }
  | opt_verb digit_count_clause
      { $$ = $2; }
  | opt_verb capitalization_clause
      { $$ = $2; }
  | opt_verb word_count_clause
      { $$ = $2; }
  ;

opt_article
  : THE
  | ART
  | /* empty */
  ;

opt_of
  : OF
  | /* empty */
  ;

opt_its
  : ITS
  | /* empty */
  ;

opt_are
  : ARE
  | /* empty */
  ;

opt_the_letter
  : THE LETTER
  | /* empty */
  ;

opt_exactly
  : EXACTLY
  | /* empty */
  ;

contains_clause
  : CONTAINS opt_article WORD LIT
      { $$ = '.*\\b' + esc($4) + '\\b.*'; }
  | CONTAINS opt_article LIT
      { $$ = '.*' + esc($3) + '.*'; }
  | CONTAINS LIT and_lits
      { $$ = andJoinLiterals([$2].concat($3)); }
  | CONTAINS LIT or_lits
      { $$ = orJoinLiterals([$2].concat($3)); }
  | CONTAINS LIT AT LEAST NUMBER TIMES
      { $$ = '(.*' + esc($2) + '.*){' + $5 + ',}'; }
  | CONTAINS opt_article DIGIT
      { $$ = '.*[0-9].*'; }
  | CONTAINS opt_article CAPITAL LETTER
      { $$ = '.*[A-Z].*'; }
  ;

and_lits
  : AND LIT
      { $$ = [$2]; }
  | and_lits AND LIT
      { $$ = $1.concat([$3]); }
  ;

or_lits
  : OR LIT
      { $$ = [$2]; }
  | or_lits OR LIT
      { $$ = $1.concat([$3]); }
  ;

starts_clause
  : STARTS WITH LIT
      { $$ = '^' + esc($3) + '.*'; }
  ;

ends_clause
  : ENDS WITH LIT
      { $$ = '.*' + esc($3) + '$'; }
  ;

words_starting_clause
  : WORD STARTS WITH opt_the_letter LIT
      { $$ = '.*\\b' + esc($5) + '[A-Za-z]*\\b.*'; }
  ;

words_ending_clause
  : WORD ENDS WITH LIT
      { $$ = '.*\\b[A-Za-z]*' + esc($4) + '\\b.*'; }
  ;

digit_count_clause
  : AT LEAST NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $3 + ',}'; }
  | opt_exactly NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $2 + '}'; }
  ;

word_count_clause
  : BETWEEN NUMBER TO NUMBER WORD
      { $$ = '([^A-Za-z]*\\b[A-Za-z]+\\b[^A-Za-z]*){' + $2 + ',' + $4 + '}'; }
  | BETWEEN NUMBER AND NUMBER WORD
      { $$ = '([^A-Za-z]*\\b[A-Za-z]+\\b[^A-Za-z]*){' + $2 + ',' + $4 + '}'; }
  | AT LEAST NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $3 + ',}'; }
  | opt_exactly NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $2 + '}'; }
  ;

capitalization_clause
  : ALL opt_of opt_its LETTER opt_are CAPITALIZED
      { $$ = '~(.*[a-z].*)'; }
  | ALL UPPERCASE
      { $$ = '~(.*[a-z].*)'; }
  | ONLY LOWERCASE LETTER
      { $$ = '[a-z]*'; }
  | ALL LOWERCASE LETTER
      { $$ = '[a-z]*'; }
  ;
