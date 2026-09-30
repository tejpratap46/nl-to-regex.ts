declare module '*/language.generated.cjs' {
  interface GeneratedLexer {
    setInput(input: string, yy?: unknown): void;
    lex(): string | number;
    yytext: string;
    EOF?: number;
  }
  interface GeneratedParser {
    parse(input: string): string;
    lexer: GeneratedLexer;
    symbols_?: Record<string, number>;
  }
  const parser: {
    parse(input: string): string;
    parser: GeneratedParser;
    lexer?: GeneratedLexer;
    symbols_?: Record<string, number>;
  };
  export default parser;
}
