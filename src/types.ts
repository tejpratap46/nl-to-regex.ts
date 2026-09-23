/**
 * A translation result. `dsl` is the raw pattern before conjunction/negation
 * normalization (see dslToRegExp.ts); `pattern`/`flags` are what you feed
 * into `new RegExp(pattern, flags)`.
 */
export interface TranslationResult {
  /** Valid ECMAScript regex source, ready for `new RegExp(pattern, flags)`. */
  pattern: string;
  flags: string;
  /** Which provider produced this result. */
  source: string;
  /** Confidence in [0, 1]. Template matches are 1.0 or 0.0 (no match). */
  confidence: number;
  /** The raw DSL/model output before normalization, for debugging. */
  raw?: string;
}

/**
 * Every backend (template engine, local LLM, remote API, ...) implements
 * this. Keeping it this small is what lets `translate()` fall through a
 * chain of providers without caring how any one of them works internally.
 */
export interface RegexProvider {
  readonly name: string;
  /** Return null (not a Promise rejection) when this provider has no answer. */
  translate(nlQuery: string): Promise<TranslationResult | null>;
}

export interface TranslateOptions {
  /** Stop at the first provider that returns a non-null result (default true). */
  stopOnFirstMatch?: boolean;
  /** Minimum confidence required to accept a result, else keep falling through. */
  minConfidence?: number;
}
