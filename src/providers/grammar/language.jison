/**
 * Grammar for translating English phrasing into the `&`/`|`/`~(...)` DSL
 * consumed by dslToRegExp.ts. Each semantic action returns a DSL-fragment
 * string built bottom-up.
 *
 * Supports matching and full composition with `and`, `or`, `after`, `before`,
 * `with`, `followed by`, `between`, negations, and arbitrary combinations.
 */

%{
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
%}

%left CLAUSE_OR
%left OR
%left AND BUT
%right NOT

%start root

%%

root
  : opt_filler expr EOF
      { return $2; }
  ;

opt_filler
  : SUBJECT THAT
  | SUBJECT CONTAINS
  | SUBJECT WITH
  | SUBJECT
  | CONTAINS
  | WITH
  | /* empty */
  ;

expr
  : expr CLAUSE_OR expr
      { $$ = '(' + $1 + ')|(' + $3 + ')'; }
  | expr OR expr
      { $$ = '(' + $1 + ')|(' + $3 + ')'; }
  | expr AND expr
      { $$ = '(' + $1 + ')&(' + $3 + ')'; }
  | expr BUT NOT expr
      { $$ = '(' + $1 + ')&(~(' + $4 + '))'; }
  | expr AND NOT expr
      { $$ = '(' + $1 + ')&(~(' + $4 + '))'; }
  | expr WITHOUT expr
      { $$ = '(' + $1 + ')&(~(' + $3 + '))'; }
  | NOT expr
      { $$ = '~(' + $2 + ')'; }
  | DO NOT expr
      { $$ = '~(' + $3 + ')'; }
  | DOES NOT expr
      { $$ = '~(' + $3 + ')'; }
  | '(' expr ')'
      { $$ = $2; }
  | clause
      { $$ = $1; }
  ;

clause
  : seq_clause
      { $$ = $1; }
  | starts_clause
      { $$ = $1; }
  | ends_clause
      { $$ = $1; }
  | words_starting_clause
      { $$ = $1; }
  | words_ending_clause
      { $$ = $1; }
  | digit_count_clause
      { $$ = $1; }
  | capitalization_clause
      { $$ = $1; }
  | word_count_clause
      { $$ = $1; }
  | contains_clause
      { $$ = $1; }
  | bare_item_clause
      { $$ = $1; }
  ;

bare_item_clause
  : item_term
      { $$ = '.*' + $1 + '.*'; }
  ;

seq_clause
  : item_term BEFORE item_term
      { $$ = '.*' + $1 + '.*' + $3 + '.*'; }
  | item_term AFTER item_term
      { $$ = '.*' + $3 + '.*' + $1 + '.*'; }
  | item_term opt_that COMES AFTER item_term
      { $$ = '.*' + $5 + '.*' + $1 + '.*'; }
  | item_term opt_that COMES BEFORE item_term
      { $$ = '.*' + $1 + '.*' + $5 + '.*'; }
  | item_term FOLLOWED_BY item_term
      { $$ = '.*' + $1 + '.*' + $3 + '.*'; }
  | item_term FOLLOWED BY item_term
      { $$ = '.*' + $1 + '.*' + $4 + '.*'; }
  | starts_clause BEFORE item_term
      { $$ = $1.replace(/\.\*$/, '') + '.*' + $3 + '.*'; }
  | starts_clause FOLLOWED_BY item_term
      { $$ = $1.replace(/\.\*$/, '') + '.*' + $3 + '.*'; }
  | starts_clause FOLLOWED BY item_term
      { $$ = $1.replace(/\.\*$/, '') + '.*' + $4 + '.*'; }
  | seq_clause BEFORE item_term
      { $$ = $1.replace(/\.\*$/, '') + '.*' + $3 + '.*'; }
  | seq_clause AFTER item_term
      { $$ = '.*' + $3 + '.*' + $1.replace(/^\.\*/, ''); }
  | seq_clause FOLLOWED_BY item_term
      { $$ = $1.replace(/\.\*$/, '') + '.*' + $3 + '.*'; }
  | seq_clause FOLLOWED BY item_term
      { $$ = $1.replace(/\.\*$/, '') + '.*' + $4 + '.*'; }
  ;

opt_that
  : THAT
  | /* empty */
  ;

item_term
  : item_atom
      { $$ = $1; }
  | item_term OR item_atom
      { $$ = '(' + $1 + '|' + $3 + ')'; }
  ;

item_atom
  : opt_article WORD LIT
      { $$ = '\\b' + esc($3) + '\\b'; }
  | opt_article LIT
      { $$ = esc($2); }
  | opt_article DIGIT
      { $$ = '[0-9]'; }
  | opt_article CAPITAL LETTER
      { $$ = '[A-Z]'; }
  | opt_article VOWEL
      { $$ = '[AEIOUaeiou]'; }
  | WORD opt_that STARTS WITH opt_the_letter LIT
      { $$ = '\\b' + esc($6) + '[A-Za-z]*\\b'; }
  | WORD opt_that ENDS WITH LIT
      { $$ = '\\b[A-Za-z]*' + esc($5) + '\\b'; }
  | WORD opt_that ENDS IN LIT
      { $$ = '\\b[A-Za-z]*' + esc($5) + '\\b'; }
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
  | LETTER
  | /* empty */
  ;

opt_exactly
  : EXACTLY
  | /* empty */
  ;

contains_clause
  : CONTAINS seq_clause
      { $$ = $2; }
  | WITH seq_clause
      { $$ = $2; }
  | CONTAINS item_term AT LEAST NUMBER TIMES
      { $$ = '(.*' + $2 + '.*){' + $5 + ',}'; }
  | CONTAINS item_term
      { $$ = '.*' + $2 + '.*'; }
  | WITH item_term
      { $$ = '.*' + $2 + '.*'; }
  ;

starts_clause
  : STARTS WITH opt_the_letter LIT
      { $$ = '^' + esc($4) + '.*'; }
  | STARTS WITH opt_article WORD LIT
      { $$ = '^\\b' + esc($4) + '\\b.*'; }
  | STARTS WITH opt_article DIGIT
      { $$ = '^[0-9].*'; }
  | STARTS WITH opt_article CAPITAL LETTER
      { $$ = '^[A-Z].*'; }
  ;

ends_clause
  : ENDS WITH opt_the_letter LIT
      { $$ = '.*' + esc($4) + '$'; }
  | ENDS IN opt_the_letter LIT
      { $$ = '.*' + esc($4) + '$'; }
  | ENDS WITH opt_article WORD LIT
      { $$ = '.*\\b' + esc($4) + '\\b$'; }
  | ENDS WITH opt_article DIGIT
      { $$ = '.*[0-9]$'; }
  | ENDS WITH opt_article CAPITAL LETTER
      { $$ = '.*[A-Z]$'; }
  ;

words_starting_clause
  : WORD STARTS WITH opt_the_letter LIT
      { $$ = '.*\\b' + esc($5) + '[A-Za-z]*\\b.*'; }
  | WORD STARTS IN opt_the_letter LIT
      { $$ = '.*\\b' + esc($5) + '[A-Za-z]*\\b.*'; }
  | WORD THAT STARTS WITH opt_the_letter LIT
      { $$ = '.*\\b' + esc($6) + '[A-Za-z]*\\b.*'; }
  | WORD THAT STARTS IN opt_the_letter LIT
      { $$ = '.*\\b' + esc($6) + '[A-Za-z]*\\b.*'; }
  ;

words_ending_clause
  : WORD ENDS WITH LIT
      { $$ = '.*\\b[A-Za-z]*' + esc($4) + '\\b.*'; }
  | WORD ENDS IN LIT
      { $$ = '.*\\b[A-Za-z]*' + esc($4) + '\\b.*'; }
  | WORD THAT ENDS WITH LIT
      { $$ = '.*\\b[A-Za-z]*' + esc($5) + '\\b.*'; }
  | WORD THAT ENDS IN LIT
      { $$ = '.*\\b[A-Za-z]*' + esc($5) + '\\b.*'; }
  ;

digit_count_clause
  : AT LEAST NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $3 + ',}'; }
  | CONTAINS AT LEAST NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $4 + ',}'; }
  | WITH AT LEAST NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $4 + ',}'; }
  | EXACTLY NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $2 + '}'; }
  | CONTAINS EXACTLY NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $3 + '}'; }
  | WITH EXACTLY NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $3 + '}'; }
  | NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $1 + '}'; }
  | CONTAINS NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $2 + '}'; }
  | WITH NUMBER DIGIT
      { $$ = '(.*[0-9].*){' + $2 + '}'; }
  | NUMBER OR MORE DIGIT
      { $$ = '(.*[0-9].*){' + $1 + ',}'; }
  | CONTAINS NUMBER OR MORE DIGIT
      { $$ = '(.*[0-9].*){' + $2 + ',}'; }
  | WITH NUMBER OR MORE DIGIT
      { $$ = '(.*[0-9].*){' + $2 + ',}'; }
  ;

word_count_clause
  : BETWEEN NUMBER TO NUMBER WORD
      { $$ = '([^A-Za-z]*\\b[A-Za-z]+\\b[^A-Za-z]*){' + $2 + ',' + $4 + '}'; }
  | BETWEEN NUMBER AND NUMBER WORD
      { $$ = '([^A-Za-z]*\\b[A-Za-z]+\\b[^A-Za-z]*){' + $2 + ',' + $4 + '}'; }
  | CONTAINS BETWEEN NUMBER TO NUMBER WORD
      { $$ = '([^A-Za-z]*\\b[A-Za-z]+\\b[^A-Za-z]*){' + $3 + ',' + $5 + '}'; }
  | CONTAINS BETWEEN NUMBER AND NUMBER WORD
      { $$ = '([^A-Za-z]*\\b[A-Za-z]+\\b[^A-Za-z]*){' + $3 + ',' + $5 + '}'; }
  | WITH BETWEEN NUMBER TO NUMBER WORD
      { $$ = '([^A-Za-z]*\\b[A-Za-z]+\\b[^A-Za-z]*){' + $3 + ',' + $5 + '}'; }
  | WITH BETWEEN NUMBER AND NUMBER WORD
      { $$ = '([^A-Za-z]*\\b[A-Za-z]+\\b[^A-Za-z]*){' + $3 + ',' + $5 + '}'; }
  | AT LEAST NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $3 + ',}'; }
  | CONTAINS AT LEAST NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $4 + ',}'; }
  | WITH AT LEAST NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $4 + ',}'; }
  | EXACTLY NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $2 + '}'; }
  | CONTAINS EXACTLY NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $3 + '}'; }
  | WITH EXACTLY NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $3 + '}'; }
  | NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $1 + '}'; }
  | CONTAINS NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $2 + '}'; }
  | WITH NUMBER WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $2 + '}'; }
  | NUMBER OR MORE WORD
      { $$ = '(.*\\b[A-Za-z]+\\b.*){' + $1 + ',}'; }
  ;

capitalization_clause
  : ALL opt_of opt_its LETTER opt_are CAPITALIZED
      { $$ = '~(.*[a-z].*)'; }
  | ALL UPPERCASE
      { $$ = '~(.*[a-z].*)'; }
  | ONLY LOWERCASE LETTER
      { $$ = '^[a-z]*$'; }
  | ALL LOWERCASE LETTER
      { $$ = '^[a-z]*$'; }
  | CONTAINS ALL opt_of opt_its LETTER opt_are CAPITALIZED
      { $$ = '~(.*[a-z].*)'; }
  | CONTAINS ALL UPPERCASE
      { $$ = '~(.*[a-z].*)'; }
  | WITH ALL opt_of opt_its LETTER opt_are CAPITALIZED
      { $$ = '~(.*[a-z].*)'; }
  | WITH ALL UPPERCASE
      { $$ = '~(.*[a-z].*)'; }
  | WITH ONLY LOWERCASE LETTER
      { $$ = '^[a-z]*$'; }
  | WITH ALL LOWERCASE LETTER
      { $$ = '^[a-z]*$'; }
  ;
