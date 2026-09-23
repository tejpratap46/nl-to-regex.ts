import type { RegexProvider, TranslationResult } from '../types.js';
import { dslToRegExp } from '../dslToRegExp.js';

/**
 * Runs the actual fine-tuned model (inclinedadarsh/gemma-3-1b-nl-to-regex)
 * locally via transformers.js, for phrasing the TemplateProvider doesn't
 * recognize.
 *
 * WHY THIS NEEDS A ONE-TIME CONVERSION STEP
 * ------------------------------------------
 * The model on the Hub is published as PyTorch safetensors. transformers.js
 * runs ONNX graphs through onnxruntime, not raw PyTorch weights, so you
 * need to export it once. From a machine with network + Python access
 * (this step can't run inside a sandboxed/offline build):
 *
 *   pip install "optimum[exporters]" --break-system-packages
 *   optimum-cli export onnx \
 *     --model inclinedadarsh/gemma-3-1b-nl-to-regex \
 *     --task text-generation-with-past \
 *     --dtype fp16 \
 *     ./models/gemma-3-1b-nl-to-regex
 *
 * Then quantize (a 1B model is ~2GB in fp16; q4 gets you to ~300-400MB,
 * which is the difference between "fine in Node" and "don't ship this to
 * a browser tab"):
 *
 *   npx @huggingface/transformers-cli quantize \
 *     ./models/gemma-3-1b-nl-to-regex --quantize q4
 *
 * Point `modelPath` below at that local directory (or upload it to your
 * own HF repo and pass the repo id instead — transformers.js accepts
 * either a local path or a hub id).
 *
 * ARCHITECTURE NOTE
 * ------------------
 * This provider is intentionally isolated behind the same RegexProvider
 * interface as TemplateProvider. Swapping this out for a hosted inference
 * endpoint (Anthropic/OpenAI-compatible chat API, a Cloudflare Worker in
 * front of onnxruntime, whatever) means writing a new class that
 * implements `translate()` — nothing else in this library changes. If you
 * go that route, delete the transformers.js dependency entirely rather
 * than keeping this file as dead weight.
 */

export interface LlmProviderOptions {
  /** Local directory (from the export above) or a HF repo id. */
  modelPath: string;
  /** Defaults to false — set true only if you're in Node with a GPU/webgpu build. */
  useGpu?: boolean;
  maxNewTokens?: number;
}

// Kept as `any` deliberately: @huggingface/transformers is an optional
// peer dependency. Importing its types unconditionally would force every
// consumer of TemplateProvider-only usage to install a ~2GB model runtime
// they don't need.
type Pipeline = any;

export class LlmProvider implements RegexProvider {
  readonly name = 'llm';
  private pipelinePromise: Promise<Pipeline> | null = null;

  constructor(private opts: LlmProviderOptions) {}

  private async getPipeline(): Promise<Pipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        let transformers: any;
        try {
          transformers = await import('@huggingface/transformers');
        } catch {
          throw new Error(
            "LlmProvider requires the optional peer dependency '@huggingface/transformers'. " +
              'Install it with: npm install @huggingface/transformers',
          );
        }
        const { pipeline } = transformers;
        return pipeline('text-generation', this.opts.modelPath, {
          device: this.opts.useGpu ? 'webgpu' : 'cpu',
          dtype: 'q4',
        });
      })();
    }
    return this.pipelinePromise;
  }

  /** Gemma's instruction format — must match what the model was fine-tuned on. */
  private formatPrompt(nlQuery: string): string {
    return `<start_of_turn>user\n${nlQuery}<end_of_turn>\n<start_of_turn>model\n`;
  }

  /** Model output is free text; pull out the first thing that looks like a regex/DSL fragment. */
  private extractDsl(generated: string): string {
    const cleaned = generated.split('<end_of_turn>')[0].trim();
    const firstLine = cleaned.split('\n')[0].trim();
    return firstLine || cleaned;
  }

  async translate(nlQuery: string): Promise<TranslationResult | null> {
    const generator = await this.getPipeline();
    const prompt = this.formatPrompt(nlQuery);
    const output = await generator(prompt, {
      max_new_tokens: this.opts.maxNewTokens ?? 64,
      do_sample: false,
    });

    const text: string = Array.isArray(output)
      ? output[0]?.generated_text ?? ''
      : (output?.generated_text ?? '');

    const dsl = this.extractDsl(text.slice(prompt.length));
    if (!dsl) return null;

    let pattern: string;
    try {
      pattern = dslToRegExp(dsl);
      // Cheap sanity check — throws if the model produced garbage.
      new RegExp(pattern);
    } catch {
      return null;
    }

    return {
      pattern,
      flags: '',
      source: 'llm:gemma-3-1b-nl-to-regex',
      // Model output is inherently uncertain; caller decides via
      // minConfidence whether to accept it or ask the user to rephrase.
      confidence: 0.6,
      raw: dsl,
    };
  }
}
