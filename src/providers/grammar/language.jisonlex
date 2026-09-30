/**
 * Lexer for the nl-to-regex phrase grammar (see language.jison).
 *
 * Tokens are grouped so that a single word (e.g. "contain"/"contains"/
 * "containing") maps to one grammar terminal — this keeps language.jison
 * focused on sentence structure rather than English morphology.
 *
 * IMPORTANT ordering rule: keyword rules must appear before the generic
 * LIT (bareword) fallback. jison-lex resolves same-length matches by
 * rule order (first rule wins), so e.g. "contains" would otherwise be
 * ambiguous between the CONTAINS keyword and a bareword literal.
 */

%options case-insensitive

%%

\s+                                   /* skip whitespace */
[,]                                   /* skip comma */
\.\s*$                                /* skip trailing period */

\'([^\']*)\'                          { yytext = yytext.slice(1, -1); return 'LIT'; }
\"([^\"]*)\"                          { yytext = yytext.slice(1, -1); return 'LIT'; }

"line"\b                              return 'SUBJECT'
"lines"\b                             return 'SUBJECT'
"string"\b                            return 'SUBJECT'
"strings"\b                           return 'SUBJECT'

"that"\b                              return 'THAT'
"which"\b                             return 'THAT'
"where"\b                             return 'THAT'
"when"\b                              return 'THAT'

"do"\b                                return 'DO'
"does"\b                              return 'DOES'
"not"\b                               return 'NOT'
"no"\b                                return 'NOT'
"without"\b                           return 'WITHOUT'
"but"\b                               return 'BUT'

"the"\b                               return 'THE'
"an"\b                                return 'ART'
"a"\b                                 return 'ART'

"contain"\b                           return 'CONTAINS'
"contains"\b                          return 'CONTAINS'
"containing"\b                        return 'CONTAINS'
"has"\b                               return 'CONTAINS'
"have"\b                              return 'CONTAINS'
"having"\b                            return 'CONTAINS'
"using"\b                             return 'CONTAINS'
"include"\b                           return 'CONTAINS'
"includes"\b                          return 'CONTAINS'
"including"\b                         return 'CONTAINS'
"match"\b                             return 'CONTAINS'
"matches"\b                           return 'CONTAINS'
"matching"\b                          return 'CONTAINS'
"feature"\b                           return 'CONTAINS'
"features"\b                          return 'CONTAINS'
"featuring"\b                         return 'CONTAINS'
"mention"\b                           return 'CONTAINS'
"mentions"\b                          return 'CONTAINS'
"mentioning"\b                        return 'CONTAINS'
"utilize"\b                           return 'CONTAINS'
"utilizes"\b                          return 'CONTAINS'
"utilizing"\b                         return 'CONTAINS'
"carry"\b                             return 'CONTAINS'
"carries"\b                           return 'CONTAINS'

"word"\b                              return 'WORD'
"words"\b                             return 'WORD'

"start"\b                             return 'STARTS'
"starts"\b                            return 'STARTS'
"starting"\b                          return 'STARTS'
"begin"\b                             return 'STARTS'
"begins"\b                            return 'STARTS'
"beginning"\b                         return 'STARTS'

"end"\b                               return 'ENDS'
"ends"\b                              return 'ENDS'
"ending"\b                            return 'ENDS'

"with"\b                              return 'WITH'
"in"\b                                return 'IN'

"before"\b                            return 'BEFORE'
"precedes"\b                          return 'BEFORE'
"precede"\b                           return 'BEFORE'
"after"\b                             return 'AFTER'
"followed"\s+"by"\b                  return 'FOLLOWED_BY'
"followed"\b                          return 'FOLLOWED'
"by"\b                                return 'BY'
"then"\b                              return 'FOLLOWED_BY'

"and"\b                               return 'AND'
"or"\b                                {
                                        if (/^\s*(starts|start|starting|begins|begin|beginning|ends|end|ending|contains|contain|containing|has|have|having|does|do|not|at|between|all|only|using|lines|line|strings|string|with)\b/i.test(this._input)) {
                                          return 'CLAUSE_OR';
                                        }
                                        return 'OR';
                                      }
"both"\b                              return 'BOTH'
"either"\b                            return 'EITHER'

"at"\b                                return 'AT'
"least"\b                             return 'LEAST'
"more"\b                              return 'MORE'
"than"\b                              return 'THAN'
"exactly"\b                           return 'EXACTLY'
"times"\b                             return 'TIMES'
"digit"\b                             return 'DIGIT'
"digits"\b                            return 'DIGIT'
"number"\b                            return 'DIGIT'
"numbers"\b                           return 'DIGIT'
"numeric"\b                           return 'DIGIT'
"capital"\b                           return 'CAPITAL'
"letter"\b                            return 'LETTER'
"letters"\b                           return 'LETTER'
"character"\b                         return 'CHARACTER'
"characters"\b                        return 'CHARACTER'
"char"\b                              return 'CHARACTER'
"chars"\b                             return 'CHARACTER'
"vowel"\b                             return 'VOWEL'
"vowels"\b                            return 'VOWEL'

"all"\b                               return 'ALL'
"of"\b                                return 'OF'
"its"\b                               return 'ITS'
"are"\b                               return 'ARE'
"is"\b                                return 'ARE'
"capitalized"\b                       return 'CAPITALIZED'
"capitalised"\b                       return 'CAPITALIZED'
"uppercase"\b                         return 'UPPERCASE'
"only"\b                              return 'ONLY'
"lowercase"\b                         return 'LOWERCASE'
"between"\b                           return 'BETWEEN'
"to"\b                                return 'TO'

"it"\b                                return 'IT'
"them"\b                              return 'IT'

"comes"\b                             return 'COMES'
"come"\b                              return 'COMES'
"found"\b                             return 'COMES'
"appears"\b                           return 'COMES'
"appear"\b                            return 'COMES'
"instances"\b                         return 'INSTANCES'
"instance"\b                          return 'INSTANCES'

"("                                   return '('
")"                                   return ')'

[0-9]+                                return 'NUMBER'
[A-Za-z][A-Za-z0-9]*                  return 'LIT'

<<EOF>>                               return 'EOF'
.                                     return 'INVALID'
