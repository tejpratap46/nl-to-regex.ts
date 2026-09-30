import type { CustomRule, MatchSpec } from './providers/templateProvider.js';
import { parseToDsl } from './providers/grammar/parser.js';
import { LIT, NUMBER } from './providers/grammar/tokenize.js';

export type ClauseCategory =
  | 'term'
  | 'position'
  | 'content'
  | 'sequence'
  | 'count'
  | 'casing'
  | 'connector'
  | 'prefix';

export interface ClauseDefinition {
  /** Unique identifier for the clause pattern */
  id: string;
  /** Broad semantic category */
  category: ClauseCategory;
  /** Human-readable label for menus / dropdowns */
  label: string;
  /** Template representation with placeholders like '{value}', '{n}' */
  template: string;
  /** Short description explaining what this clause matches */
  description: string;
  /** Concrete example phrasings */
  examples: string[];
  /** Search keywords useful for client-side fuzzy or prefix matching */
  keywords: string[];
  /** Default insertion snippet or template text */
  snippet?: string;
}

export interface AutocompleteSuggestion {
  /** Text to insert into the input */
  insertText: string;
  /** Human-readable label for UI display */
  label: string;
  /** Category of this suggestion */
  category: ClauseCategory | 'custom';
  /** Brief detail / explanation */
  detail?: string;
  /** Clause definition ID if tied to a catalog clause */
  clauseId?: string;
  /** Examples or documentation */
  documentation?: string;
}

export type AutocompleteContext =
  | 'start'
  | 'after-prefix'
  | 'clause-continuation'
  | 'after-clause'
  | 'after-connector';

export interface AutocompleteResult {
  /** List of completion suggestions */
  suggestions: AutocompleteSuggestion[];
  /** The word fragment being typed at the cursor (empty string if right after a space) */
  filterText: string;
  /** Detected query context at the cursor */
  context: AutocompleteContext;
}

export interface AutocompleteOptions {
  /** Custom rules registered by the user to include in suggestions */
  customRules?: CustomRule[];
  /** Filter suggestions by specific categories */
  categories?: ClauseCategory[];
  /** Maximum number of suggestions to return */
  limit?: number;
}

/** Complete catalog of built-in natural language clauses and patterns supported by nl-to-regex */
export const CLAUSES: readonly ClauseDefinition[] = Object.freeze([
  // --- Terms & Direct Items (No boilerplate needed) ---
  {
    id: 'term_literal',
    category: 'term',
    label: "'...'",
    template: "'{text}'",
    description: 'Matches text containing the given literal or character',
    examples: ["'a'", "'dance'", "'uu'"],
    keywords: ['literal', 'term', 'text', 'quote'],
    snippet: "''",
  },
  {
    id: 'term_word',
    category: 'term',
    label: "the word '...'",
    template: "the word '{word}'",
    description: 'Matches an exact whole word',
    examples: ["the word 'dance'", "the word 'cat'"],
    keywords: ['word', 'the', 'whole'],
    snippet: "the word ''",
  },
  {
    id: 'term_digit',
    category: 'term',
    label: 'a digit',
    template: 'a digit',
    description: 'Matches any digit (0-9)',
    examples: ['a digit', 'a number'],
    keywords: ['digit', 'number', 'numeric'],
    snippet: 'a digit',
  },
  {
    id: 'term_capital',
    category: 'term',
    label: 'a capital letter',
    template: 'a capital letter',
    description: 'Matches any uppercase letter (A-Z)',
    examples: ['a capital letter'],
    keywords: ['capital', 'letter', 'uppercase'],
    snippet: 'a capital letter',
  },
  {
    id: 'term_vowel',
    category: 'term',
    label: 'a vowel',
    template: 'a vowel',
    description: 'Matches any vowel (a, e, i, o, u)',
    examples: ['a vowel'],
    keywords: ['vowel'],
    snippet: 'a vowel',
  },

  // --- Position Clauses ---
  {
    id: 'starts_with_text',
    category: 'position',
    label: "starts with '...'",
    template: "starts with '{text}'",
    description: 'Matches strings that begin with the specified text',
    examples: ["starts with 'uu'", "begins with 'https'"],
    keywords: ['starts', 'start', 'starting', 'begins', 'begin', 'beginning', 'with'],
    snippet: "starts with ''",
  },
  {
    id: 'starts_with_word',
    category: 'position',
    label: "starts with the word '...'",
    template: "starts with the word '{word}'",
    description: 'Matches strings starting with an exact whole word',
    examples: ["starts with the word 'error'", "starts with a word 'cat'"],
    keywords: ['starts', 'start', 'word', 'with'],
    snippet: "starts with the word ''",
  },
  {
    id: 'starts_with_digit',
    category: 'position',
    label: 'starts with a digit',
    template: 'starts with a digit',
    description: 'Matches strings that start with a numeric digit (0-9)',
    examples: ['starts with a digit', 'starts with digit'],
    keywords: ['starts', 'start', 'digit', 'number', 'numeric'],
    snippet: 'starts with a digit',
  },
  {
    id: 'starts_with_capital',
    category: 'position',
    label: 'starts with a capital letter',
    template: 'starts with a capital letter',
    description: 'Matches strings that start with an uppercase letter (A-Z)',
    examples: ['starts with a capital letter', 'starts with capital letter'],
    keywords: ['starts', 'start', 'capital', 'letter', 'uppercase'],
    snippet: 'starts with a capital letter',
  },
  {
    id: 'ends_with_text',
    category: 'position',
    label: "ends with '...'",
    template: "ends with '{text}'",
    description: 'Matches strings that end with the specified text',
    examples: ["ends with 'f'", "ends in 'ing'"],
    keywords: ['ends', 'end', 'ending', 'with', 'in'],
    snippet: "ends with ''",
  },
  {
    id: 'ends_with_word',
    category: 'position',
    label: "ends with the word '...'",
    template: "ends with the word '{word}'",
    description: 'Matches strings ending with an exact whole word',
    examples: ["ends with the word 'done'", "ends with a word 'end'"],
    keywords: ['ends', 'end', 'word', 'with'],
    snippet: "ends with the word ''",
  },
  {
    id: 'ends_with_digit',
    category: 'position',
    label: 'ends with a digit',
    template: 'ends with a digit',
    description: 'Matches strings that end with a numeric digit (0-9)',
    examples: ['ends with a digit', 'ends with digit'],
    keywords: ['ends', 'end', 'digit', 'number', 'numeric'],
    snippet: 'ends with a digit',
  },
  {
    id: 'ends_with_capital',
    category: 'position',
    label: 'ends with a capital letter',
    template: 'ends with a capital letter',
    description: 'Matches strings that end with an uppercase letter (A-Z)',
    examples: ['ends with a capital letter', 'ends with capital letter'],
    keywords: ['ends', 'end', 'capital', 'letter', 'uppercase'],
    snippet: 'ends with a capital letter',
  },
  {
    id: 'words_starting_with',
    category: 'position',
    label: "words starting with '...'",
    template: "words starting with '{prefix}'",
    description: 'Matches whole words that begin with a specific prefix',
    examples: ["words starting with 'z'", "word starts with 'un'"],
    keywords: ['words', 'word', 'starting', 'starts', 'with', 'prefix'],
    snippet: "words starting with ''",
  },
  {
    id: 'words_ending_with',
    category: 'position',
    label: "words ending in '...'",
    template: "words ending in '{suffix}'",
    description: 'Matches whole words that end with a specific suffix',
    examples: ["words ending in 'er'", "words ending with 'ly'"],
    keywords: ['words', 'word', 'ending', 'ends', 'in', 'with', 'suffix'],
    snippet: "words ending in ''",
  },

  // --- Content Clauses ---
  {
    id: 'contains_text',
    category: 'content',
    label: "contains '...'",
    template: "contains '{text}'",
    description: 'Matches strings containing the given substring',
    examples: ["contains 'dance'", "contains 'black'"],
    keywords: ['contains', 'contain', 'containing', 'has', 'have', 'includes'],
    snippet: "contains ''",
  },
  {
    id: 'contains_word',
    category: 'content',
    label: "contains the word '...'",
    template: "contains the word '{word}'",
    description: 'Matches strings containing an exact whole word',
    examples: ["contains the word 'dance'", "contains the word 'foo'"],
    keywords: ['contains', 'word', 'whole', 'match'],
    snippet: "contains the word ''",
  },
  {
    id: 'contains_digit',
    category: 'content',
    label: 'contains a digit',
    template: 'contains a digit',
    description: 'Matches strings containing at least one digit (0-9)',
    examples: ['contains a digit', 'contains a number'],
    keywords: ['contains', 'digit', 'number', 'numeric'],
    snippet: 'contains a digit',
  },
  {
    id: 'contains_capital',
    category: 'content',
    label: 'contains a capital letter',
    template: 'contains a capital letter',
    description: 'Matches strings containing at least one capital letter (A-Z)',
    examples: ['contains a capital letter'],
    keywords: ['contains', 'capital', 'letter', 'uppercase'],
    snippet: 'contains a capital letter',
  },
  {
    id: 'contains_vowel',
    category: 'content',
    label: 'contains a vowel',
    template: 'contains a vowel',
    description: 'Matches strings containing any vowel (a, e, i, o, u)',
    examples: ['contains a vowel'],
    keywords: ['contains', 'vowel'],
    snippet: 'contains a vowel',
  },
  {
    id: 'contains_times',
    category: 'content',
    label: "contains '...' at least N times",
    template: "contains '{text}' at least {n} times",
    description: 'Matches strings containing a substring repeated at least N times',
    examples: ["contains 'x' at least 3 times"],
    keywords: ['contains', 'times', 'repeated', 'at', 'least'],
    snippet: "contains '' at least 3 times",
  },

  // --- Count Clauses ---
  {
    id: 'digit_count_at_least',
    category: 'count',
    label: 'at least N digits',
    template: 'at least {n} digits',
    description: 'Matches strings containing at least N numeric digits',
    examples: ['at least 3 digits', 'contains at least 3 numbers'],
    keywords: ['at', 'least', 'digits', 'numbers', 'count', 'min'],
    snippet: 'at least 3 digits',
  },
  {
    id: 'digit_count_exact',
    category: 'count',
    label: 'exactly N digits',
    template: 'exactly {n} digits',
    description: 'Matches strings containing exactly N numeric digits',
    examples: ['exactly 5 digits', 'with exactly 5 digits'],
    keywords: ['exactly', 'digits', 'numbers', 'count'],
    snippet: 'exactly 5 digits',
  },
  {
    id: 'digit_count_or_more',
    category: 'count',
    label: 'N or more digits',
    template: '{n} or more digits',
    description: 'Matches strings containing N or more numeric digits',
    examples: ['3 or more digits'],
    keywords: ['digits', 'more', 'numbers', 'or'],
    snippet: '3 or more digits',
  },
  {
    id: 'digit_count',
    category: 'count',
    label: 'N digits',
    template: '{n} digits',
    description: 'Matches strings containing N digits',
    examples: ['5 digits', 'contains 5 digits'],
    keywords: ['digits', 'numbers', 'count'],
    snippet: '5 digits',
  },
  {
    id: 'word_count_between',
    category: 'count',
    label: 'between N and M words',
    template: 'between {min} and {max} words',
    description: 'Matches strings containing a word count within the given range',
    examples: ['between 2 and 5 words', 'between 2 to 5 words'],
    keywords: ['between', 'and', 'to', 'words', 'range', 'count'],
    snippet: 'between 2 and 5 words',
  },
  {
    id: 'word_count_at_least',
    category: 'count',
    label: 'at least N words',
    template: 'at least {n} words',
    description: 'Matches strings containing at least N words',
    examples: ['at least 4 words', 'contains at least 4 words'],
    keywords: ['at', 'least', 'words', 'count'],
    snippet: 'at least 3 words',
  },
  {
    id: 'word_count_exact',
    category: 'count',
    label: 'exactly N words',
    template: 'exactly {n} words',
    description: 'Matches strings containing exactly N words',
    examples: ['exactly 3 words', 'with exactly 3 words'],
    keywords: ['exactly', 'words', 'count'],
    snippet: 'exactly 3 words',
  },
  {
    id: 'word_count',
    category: 'count',
    label: 'N words',
    template: '{n} words',
    description: 'Matches strings containing N words',
    examples: ['3 words', 'with 3 words'],
    keywords: ['words', 'count'],
    snippet: '3 words',
  },

  // --- Casing Clauses ---
  {
    id: 'casing_all_capitalized',
    category: 'casing',
    label: 'all of its letters are capitalized',
    template: 'all of its letters are capitalized',
    description: 'Matches strings where all alphabetical characters are uppercase',
    examples: ['all of its letters are capitalized', 'all letters are capitalized'],
    keywords: ['all', 'letters', 'capitalized', 'uppercase'],
    snippet: 'all of its letters are capitalized',
  },
  {
    id: 'casing_all_uppercase',
    category: 'casing',
    label: 'all uppercase',
    template: 'all uppercase',
    description: 'Matches strings containing only uppercase letters',
    examples: ['all uppercase', 'with all uppercase'],
    keywords: ['all', 'uppercase'],
    snippet: 'all uppercase',
  },
  {
    id: 'casing_only_lowercase',
    category: 'casing',
    label: 'only lowercase letters',
    template: 'only lowercase letters',
    description: 'Matches strings consisting entirely of lowercase letters',
    examples: ['only lowercase letters', 'with only lowercase letters'],
    keywords: ['only', 'lowercase', 'letters'],
    snippet: 'only lowercase letters',
  },

  // --- Sequence Clauses ---
  {
    id: 'sequence_before',
    category: 'sequence',
    label: "'...' before '...'",
    template: "'{first}' before '{second}'",
    description: 'Matches when the first term appears anywhere before the second term',
    examples: ["'q' before 'r'", "'foo' before 'bar'"],
    keywords: ['before', 'precedes', 'sequence', 'order'],
    snippet: "'' before ''",
  },
  {
    id: 'sequence_after',
    category: 'sequence',
    label: "'...' after '...'",
    template: "'{first}' after '{second}'",
    description: 'Matches when the first term appears anywhere after the second term',
    examples: ["'su' after 'son' or 'soon'", "'b' after 'a'"],
    keywords: ['after', 'sequence', 'order'],
    snippet: "'' after ''",
  },
  {
    id: 'sequence_followed_by',
    category: 'sequence',
    label: "'...' followed by '...'",
    template: "'{first}' followed by '{second}'",
    description: 'Matches when the first term is followed by the second term',
    examples: ["starts with 'uu' followed by words starting with 'z'"],
    keywords: ['followed', 'by', 'then', 'sequence'],
    snippet: "followed by ''",
  },

  // --- Connectors ---
  {
    id: 'conn_and',
    category: 'connector',
    label: 'and',
    template: '{clause} and {clause}',
    description: 'Conjunction: both conditions must match',
    examples: ["starts with 'a' and ends with 'b'", "contains 'a' and 'b'"],
    keywords: ['and', 'conjunction'],
    snippet: 'and ',
  },
  {
    id: 'conn_or',
    category: 'connector',
    label: 'or',
    template: '{clause} or {clause}',
    description: 'Alternation: at least one condition must match',
    examples: ["starts with 'a' or ends with 'b'", "'mix' or 'shake'"],
    keywords: ['or', 'alternation', 'either'],
    snippet: 'or ',
  },
  {
    id: 'conn_but_not',
    category: 'connector',
    label: 'but not',
    template: '{clause} but not {clause}',
    description: 'Negation conjunction: condition holds but another does not',
    examples: ["have 'sandwich' but not the word 'ham'"],
    keywords: ['but', 'not', 'except', 'without'],
    snippet: 'but not ',
  },
  {
    id: 'conn_without',
    category: 'connector',
    label: 'without',
    template: '{clause} without {clause}',
    description: 'Exclusion: first condition holds without the second',
    examples: ["'apple' without 'pie'"],
    keywords: ['without', 'excluding', 'not'],
    snippet: 'without ',
  },
  {
    id: 'conn_followed_by',
    category: 'connector',
    label: 'followed by',
    template: '{clause} followed by {clause}',
    description: 'Sequential order connector',
    examples: ["starts with 'a' followed by 'b'"],
    keywords: ['followed', 'by', 'then'],
    snippet: 'followed by ',
  },
  {
    id: 'conn_before',
    category: 'connector',
    label: 'before',
    template: '{clause} before {clause}',
    description: 'Order connector: preceding term comes before next term',
    examples: ["'a' before 'b'"],
    keywords: ['before'],
    snippet: 'before ',
  },
  {
    id: 'conn_after',
    category: 'connector',
    label: 'after',
    template: '{clause} after {clause}',
    description: 'Order connector: preceding term comes after next term',
    examples: ["'b' after 'a'"],
    keywords: ['after'],
    snippet: 'after ',
  },
]);

/**
 * Returns all supported clauses, optionally filtered by category.
 */
export function getClauses(category?: ClauseCategory): ClauseDefinition[] {
  if (!category) return [...CLAUSES];
  return CLAUSES.filter((c) => c.category === category);
}

/** Check if a custom rule match item is a sentinel */
function isSentinel(s: MatchSpec): boolean {
  return s === LIT || s === NUMBER;
}

/** Format a CustomRule into a human-readable template string */
function formatCustomRule(rule: CustomRule): { label: string; insertText: string } {
  const parts = rule.match.map((item) => {
    if (item === LIT) return "'{text}'";
    if (item === NUMBER) return '{number}';
    return item;
  });
  return {
    label: parts.join(' '),
    insertText: parts.join(' '),
  };
}

/** Convert a ClauseDefinition into an AutocompleteSuggestion */
function clauseToSuggestion(c: ClauseDefinition): AutocompleteSuggestion {
  return {
    insertText: c.snippet ?? c.label,
    label: c.label,
    category: c.category,
    detail: c.description,
    clauseId: c.id,
    documentation: c.examples.join('\n'),
  };
}

const CONNECTOR_WORDS = new Set(['and', 'or', 'but', 'without', 'followed', 'before', 'after', 'then']);
const PREFIX_WORDS = new Set(['lines', 'strings', 'line', 'string', 'contains', 'with']);

/**
 * Provides context-aware suggestions for completing a natural language query,
 * particularly designed for autocompletion after typing a space or typing a partial word.
 *
 * @param query The current query string typed by the user.
 * @param options Custom rules, category filters, and result limit.
 */
export function autocomplete(query: string, options: AutocompleteOptions = {}): AutocompleteResult {
  const rawInput = query ?? '';
  const hasTrailingSpace = /\s+$/.test(rawInput);

  // Extract all tokens (words and quoted strings)
  const tokenMatches = [...rawInput.matchAll(/("[^"]*"|'[^']*'|\S+)/g)].map((m) => m[0]);

  let filterText = '';
  let priorTokens: string[] = [];

  if (hasTrailingSpace || tokenMatches.length === 0) {
    filterText = '';
    priorTokens = tokenMatches;
  } else {
    filterText = tokenMatches[tokenMatches.length - 1];
    priorTokens = tokenMatches.slice(0, -1);
  }

  const priorLower = priorTokens.map((t) => t.toLowerCase());
  const lastPriorLower = priorLower.length > 0 ? priorLower[priorLower.length - 1] : '';
  const secondLastPriorLower = priorLower.length > 1 ? priorLower[priorLower.length - 2] : '';
  const priorText = priorTokens.join(' ');

  let context: AutocompleteContext = 'start';
  let candidateSuggestions: AutocompleteSuggestion[] = [];

  // Determine context and candidate suggestions
  if (priorTokens.length === 0) {
    // 1. Initial input (empty or only whitespace) - suggest direct terms, positions, counts, etc.
    context = 'start';
    candidateSuggestions = CLAUSES.filter(
      (c) => c.category !== 'connector' && c.category !== 'prefix',
    ).map(clauseToSuggestion);
  } else if (
    (priorLower.length === 2 && (priorLower[0] === 'lines' || priorLower[0] === 'strings') && (priorLower[1] === 'that' || priorLower[1] === 'with' || priorLower[1] === 'containing')) ||
    (priorLower.length === 1 && PREFIX_WORDS.has(priorLower[0]))
  ) {
    // 2. Just after a query prefix if explicitly typed by user (e.g. "lines that ")
    context = 'after-prefix';
    candidateSuggestions = CLAUSES.filter(
      (c) => c.category !== 'connector' && c.category !== 'prefix',
    ).map(clauseToSuggestion);
  } else if (
    lastPriorLower === 'and' ||
    lastPriorLower === 'or' ||
    lastPriorLower === 'without' ||
    (secondLastPriorLower === 'but' && lastPriorLower === 'not') ||
    (secondLastPriorLower === 'and' && lastPriorLower === 'not') ||
    (secondLastPriorLower === 'followed' && lastPriorLower === 'by') ||
    lastPriorLower === 'before' ||
    lastPriorLower === 'after'
  ) {
    // 3. Just after a connector (e.g. "'a' and ", "'b' after ", "... or ")
    context = 'after-connector';
    candidateSuggestions = CLAUSES.filter(
      (c) => c.category !== 'connector' && c.category !== 'prefix',
    ).map(clauseToSuggestion);
  } else if (
    lastPriorLower === 'starts' ||
    lastPriorLower === 'begins' ||
    lastPriorLower === 'start' ||
    lastPriorLower === 'begin'
  ) {
    // 4. In-clause continuation: after "starts"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "with ''", label: "with '...'", category: 'position', detail: "Starts with specific text" },
      { insertText: "with the word ''", label: "with the word '...'", category: 'position', detail: "Starts with a whole word" },
      { insertText: "with a digit", label: "with a digit", category: 'position', detail: "Starts with a digit (0-9)" },
      { insertText: "with a capital letter", label: "with a capital letter", category: 'position', detail: "Starts with an uppercase letter" },
    ];
  } else if (
    (lastPriorLower === 'with' && (secondLastPriorLower === 'starts' || secondLastPriorLower === 'begins'))
  ) {
    // In-clause continuation: after "starts with"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "''", label: "'...'", category: 'position', detail: "Quoted literal or character" },
      { insertText: "the word ''", label: "the word '...'", category: 'position', detail: "A whole word" },
      { insertText: "a digit", label: "a digit", category: 'position', detail: "A digit (0-9)" },
      { insertText: "a capital letter", label: "a capital letter", category: 'position', detail: "A capital letter (A-Z)" },
    ];
  } else if (lastPriorLower === 'ends' || lastPriorLower === 'end') {
    // In-clause continuation: after "ends"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "with ''", label: "with '...'", category: 'position', detail: "Ends with specific text" },
      { insertText: "in ''", label: "in '...'", category: 'position', detail: "Ends in specific text" },
      { insertText: "with the word ''", label: "with the word '...'", category: 'position', detail: "Ends with a whole word" },
      { insertText: "with a digit", label: "with a digit", category: 'position', detail: "Ends with a digit (0-9)" },
      { insertText: "with a capital letter", label: "with a capital letter", category: 'position', detail: "Ends with an uppercase letter" },
    ];
  } else if (lastPriorLower === 'at') {
    // In-clause continuation: after "at"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "least 3 digits", label: "least N digits", category: 'count', detail: "Minimum number of digits" },
      { insertText: "least 3 words", label: "least N words", category: 'count', detail: "Minimum number of words" },
      { insertText: "least 3 times", label: "least N times", category: 'content', detail: "Minimum occurrences" },
    ];
  } else if (secondLastPriorLower === 'at' && lastPriorLower === 'least') {
    // In-clause continuation: after "at least"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "3 digits", label: "N digits", category: 'count', detail: "Minimum number of digits" },
      { insertText: "3 words", label: "N words", category: 'count', detail: "Minimum number of words" },
      { insertText: "3 times", label: "N times", category: 'content', detail: "Minimum occurrences" },
    ];
  } else if (lastPriorLower === 'exactly') {
    // In-clause continuation: after "exactly"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "5 digits", label: "N digits", category: 'count', detail: "Exact number of digits" },
      { insertText: "3 words", label: "N words", category: 'count', detail: "Exact number of words" },
    ];
  } else if (lastPriorLower === 'between') {
    // In-clause continuation: after "between"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "2 and 5 words", label: "N and M words", category: 'count', detail: "Word count between N and M" },
    ];
  } else if (lastPriorLower === 'words' || lastPriorLower === 'word') {
    // In-clause continuation: after "words"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "starting with ''", label: "starting with '...'", category: 'position', detail: "Words starting with prefix" },
      { insertText: "ending in ''", label: "ending in '...'", category: 'position', detail: "Words ending in suffix" },
      { insertText: "that start with ''", label: "that start with '...'", category: 'position', detail: "Words that start with prefix" },
      { insertText: "that end with ''", label: "that end with '...'", category: 'position', detail: "Words that end with suffix" },
    ];
  } else if (lastPriorLower === 'all') {
    // In-clause continuation: after "all"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "uppercase", label: "uppercase", category: 'casing', detail: "All uppercase letters" },
      { insertText: "of its letters are capitalized", label: "of its letters are capitalized", category: 'casing', detail: "All letters capitalized" },
      { insertText: "lowercase letters", label: "lowercase letters", category: 'casing', detail: "All lowercase letters" },
    ];
  } else if (lastPriorLower === 'only') {
    // In-clause continuation: after "only"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "lowercase letters", label: "lowercase letters", category: 'casing', detail: "Only lowercase letters" },
    ];
  } else if (lastPriorLower === 'followed') {
    // In-clause continuation: after "followed"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "by ''", label: "by '...'", category: 'sequence', detail: "Followed by a term" },
    ];
  } else if (lastPriorLower === 'but') {
    // In-clause continuation: after "but"
    context = 'clause-continuation';
    candidateSuggestions = [
      { insertText: "not ", label: "not", category: 'connector', detail: "Conjunction negation" },
    ];
  } else {
    // 5. Test if the prior phrase forms a valid expression
    const dsl = parseToDsl(priorText);
    if (dsl !== null) {
      // Completed clause! Offer connectors as primary, plus sequence continuations and other clauses
      context = 'after-clause';
      const connectors = CLAUSES.filter((c) => c.category === 'connector').map(clauseToSuggestion);
      const sequenceContinuations: AutocompleteSuggestion[] = [
        { insertText: "after ''", label: "after '...'", category: 'sequence', detail: "Occurs after another term" },
        { insertText: "before ''", label: "before '...'", category: 'sequence', detail: "Occurs before another term" },
        { insertText: "followed by ''", label: "followed by '...'", category: 'sequence', detail: "Followed by another term" },
      ];
      const otherClauses = CLAUSES.filter(
        (c) => c.category !== 'connector' && c.category !== 'prefix' && c.category !== 'term',
      ).map(clauseToSuggestion);
      candidateSuggestions = [...connectors, ...sequenceContinuations, ...otherClauses];
    } else {
      // Default fallback: offer all direct clauses
      context = 'after-prefix';
      candidateSuggestions = CLAUSES.filter(
        (c) => c.category !== 'connector' && c.category !== 'prefix',
      ).map(clauseToSuggestion);
    }
  }

  // Include user custom rules if available, prioritizing rules matching current input
  if (options.customRules && options.customRules.length > 0) {
    const matchingCustom: AutocompleteSuggestion[] = [];
    const nonMatchingCustom: AutocompleteSuggestion[] = [];

    for (const rule of options.customRules) {
      const { label, insertText } = formatCustomRule(rule);
      let isPrefix = false;
      if (priorLower.length > 0 && priorLower.length <= rule.match.length) {
        isPrefix = priorLower.every((token, idx) => {
          const spec = rule.match[idx];
          if (spec === LIT) return true;
          if (spec === NUMBER) return /^\d+$/.test(token);
          return typeof spec === 'string' && spec.toLowerCase() === token;
        });
      }

      if (isPrefix) {
        const remaining = rule.match.slice(priorLower.length).map((spec) => {
          if (spec === LIT) return "'{text}'";
          if (spec === NUMBER) return '{number}';
          return spec;
        }).join(' ');

        matchingCustom.push({
          insertText: remaining || insertText,
          label,
          category: 'custom',
          detail: 'User-defined custom rule',
        });
      } else {
        nonMatchingCustom.push({
          insertText,
          label,
          category: 'custom',
          detail: 'User-defined custom rule',
        });
      }
    }

    if (matchingCustom.length > 0) {
      context = 'clause-continuation';
      candidateSuggestions = [...matchingCustom, ...candidateSuggestions, ...nonMatchingCustom];
    } else {
      candidateSuggestions = [...nonMatchingCustom, ...candidateSuggestions];
    }
  }

  // Filter by category if requested
  if (options.categories && options.categories.length > 0) {
    const catSet = new Set(options.categories);
    candidateSuggestions = candidateSuggestions.filter(
      (s) => s.category === 'custom' || catSet.has(s.category as ClauseCategory),
    );
  }

  // Filter by filterText (partial word typed by user)
  let filtered = candidateSuggestions;
  if (filterText.length > 0) {
    const fLower = filterText.toLowerCase();
    filtered = candidateSuggestions.filter((s) => {
      if (s.label.toLowerCase().startsWith(fLower)) return true;
      if (s.insertText.toLowerCase().startsWith(fLower)) return true;
      if (s.clauseId) {
        const def = CLAUSES.find((c) => c.id === s.clauseId);
        if (def && def.keywords.some((k) => k.toLowerCase().startsWith(fLower))) {
          return true;
        }
      }
      return false;
    });
  }

  // Remove duplicates by label/insertText
  const seen = new Set<string>();
  const uniqueSuggestions: AutocompleteSuggestion[] = [];
  for (const item of filtered) {
    const key = `${item.category}:${item.insertText}:${item.label}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSuggestions.push(item);
    }
  }

  // Apply limit
  const limit = options.limit && options.limit > 0 ? options.limit : uniqueSuggestions.length;
  const suggestions = uniqueSuggestions.slice(0, limit);

  return {
    suggestions,
    filterText,
    context,
  };
}
