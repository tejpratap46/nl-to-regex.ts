declare module '*/language.generated.js' {
  interface GeneratedLexer {
    setInput(input: string, yy?: unknown): void;
    lex(): string | number;
    yytext: string;
    EOF?: number;
  }
  interface GeneratedParser {
    parse(input: string, ...args: any[]): string;
    lexer: GeneratedLexer;
    symbols_?: Record<string, number>;
    Parser?: any;
    parser?: GeneratedParser;
  }
  export const parser: GeneratedParser;
  export const Parser: any;
  export const parse: (input: string, ...args: any[]) => string;
  const language: GeneratedParser;
  export default language;
}
