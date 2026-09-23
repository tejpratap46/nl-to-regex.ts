// Optional peer dependency — only needed if you construct an LlmProvider.
// This ambient declaration lets the library compile without it installed;
// consumers who actually use LlmProvider get real types once they run
// `npm install @huggingface/transformers` (it ships its own .d.ts files
// which take precedence over this fallback).
declare module '@huggingface/transformers';
