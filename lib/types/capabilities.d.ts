/**
 * Per-provider output parameter capabilities (aspect ratios, quality tiers)
 * and the ratio→wire-size mappings, aligned with vendor docs as of 2026-09:
 *
 * - google (gemini-3.1-flash-image): 14 ratios incl. extremes, 512/1K/2K/4K.
 *   We expose the 10 common ratios; extreme strips (1:4/4:1/1:8/8:1) and the
 *   Flash-only 512 tier stay out (512 breaks when the user switches to a pro
 *   model, and tiny outputs have no real use case here).
 * - openai (gpt-image-2): any WIDTHxHEIGHT with 16-divisible edges, ratio
 *   within 1:3–3:1, ≤3840x2160; quality low/medium/high/auto.
 * - seedream (doubao-seedream-5-0): size is either a tier string (2K/3K/4K —
 *   1K was dropped in 5.0) or exact pixels from the official tier×ratio table.
 * - dashscope (qwen-image-3.0): free pixels within 512*512–2048*2048, ratio
 *   1:8–8:1; no quality parameter.
 * - xai (grok-imagine-image): NO size parameter at all — aspect_ratio (15
 *   values incl. auto) + resolution 1k/2k.
 * - zhipu (glm-image): 7 recommended sizes (32-divisible, ≤2^22 px); quality
 *   hd only (standard exists on cogview-4, hd works on both).
 * - chatgpt-sub (gpt-image-2.5-flare): the private Codex route accepts the
 *   same size/quality request fields as the public Image API, but may return
 *   different effective dimensions/quality. Treat these options as requests.
 * - grok-sub (grok-imagine-image-2.0): aspect_ratio + resolution 1k/2k.
 * - google-sub (gemini-3.1-flash-image): 10 ratios + imageSize 1K/2K/4K (we expose
 *   standard/HD → default/4K).
 */
import type { CloudImageProvider, StudioOption, SubscriptionProvider } from './shared.js';
/** zh labels shared by the server-side profiles; the client re-localizes. */
export declare const RATIO_LABELS: Record<string, string>;
export interface ProviderCapability {
    ratioOptions: StudioOption[];
    qualityOptions: StudioOption[];
    defaultRatio: string;
    defaultQuality: string;
    /**
     * Resolve the wire `size` for providers that speak pixel dimensions
     * (openai/seedream/dashscope/zhipu/chatgpt-sub). Returns undefined when the
     * channel takes no size (ratio `auto`) so the vendor default applies.
     */
    sizeFor?(ratio: string, quality: string): string | undefined;
}
export declare const CLOUD_CAPABILITIES: Record<Exclude<CloudImageProvider, 'openai-compat'>, ProviderCapability>;
export declare const SUBSCRIPTION_CAPABILITIES: Record<SubscriptionProvider, ProviderCapability>;
