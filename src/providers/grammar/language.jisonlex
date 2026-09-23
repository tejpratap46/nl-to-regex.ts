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

\'([^\']*)\'                          { yytext = yytext.slice(1, -1); return 'LIT'; }
\"([^\"]*)\"                          { yytext = yytext.slice(1, -1); return 'LIT'; }

"line"\b                              return 'SUBJECT'
"lines"\b                             return 'SUBJECT'
"string"\b                            return 'SUBJECT'
"strings"\b                           return 'SUBJECT'
"that"\b                              return 'THAT'
"which"\b                             return 'THAT'
"do"\b                                return 'DO'
"does"\b                              return 'DOES'
"not"\b                               return 'NOT'
"the"\b                               return 'THE'
"an"\b                                return 'ART'
"a"\b                                 return 'ART'
"contain"\b                           return 'CONTAINS'
"contains"\b                          return 'CONTAINS'
"containing"\b                        return 'CONTAINS'
"has"\b                               return 'CONTAINS'
"have"\b                              return 'CONTAINS'
"using"\b                             return 'CONTAINS'
"include"\b                           return 'CONTAINS'
"includes"\b                          return 'CONTAINS'
"word"\b                              return 'WORD'
"words"\b                             return 'WORD'
"start"\b                             return 'STARTS'
"starts"\b                            return 'STARTS'
"starting"\b                          return 'STARTS'
"end"\b                               return 'ENDS'
"ends"\b                              return 'ENDS'
"ending"\b                            return 'ENDS'
"with"\b                              return 'WITH'
"in"\b                                return 'WITH'
"and"\b                                return 'AND'
"or"\b                                 return 'OR'
"at"\b                                return 'AT'
"least"\b                             return 'LEAST'
"exactly"\b                           return 'EXACTLY'
"times"\b                             return 'TIMES'
"digit"\b                             return 'DIGIT'
"digits"\b                            return 'DIGIT'
"number"\b                            return 'DIGIT'
"numbers"\b                           return 'DIGIT'
"capital"\b                           return 'CAPITAL'
"letter"\b                            return 'LETTER'
"letters"\b                           return 'LETTER'
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

[0-9]+                                return 'NUMBER'
[A-Za-z][A-Za-z0-9]*                  return 'LIT'

<<EOF>>                               return 'EOF'
.                                     return 'INVALID'
