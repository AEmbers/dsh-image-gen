/**
 * ComfyUI as a browser-workbench provider.
 *
 * One imported workflow is one workbench row. Everything the pickers show is
 * read out of that workflow's graph: the latent node declares the output size,
 * the sampler declares the steps and CFG the author tuned, and the `{{image}}`
 * placeholder decides whether the row can edit.
 *
 * Choosing a ratio rewrites the latent node at the workflow's own pixel budget,
 * so a bigger aspect never quietly costs more VRAM than the graph was built
 * for. Quality reports the sampler as authored instead of inventing step counts
 * for someone else's graph — a distilled model can lose a whole look at half
 * the steps, and that is the workflow author's call, not the workbench's.
 */
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
import type { Config } from './config.js';
import { type ComfyUISourceImage } from './comfyui.js';
import { type ComfyUIDimensions } from './comfyui-workflow.js';
import { type ComfyUIWorkflowEntry, type StudioGenerateRequest, type StudioProviderProfile } from './shared.js';
/** Label prefix every ComfyUI workbench row shares. */
export declare const COMFYUI_STUDIO_LABEL = "\u672C\u5730 ComfyUI";
/** Value of the quality option: the workflow runs its own sampler settings. */
export declare const COMFYUI_STUDIO_QUALITY = "workflow";
/**
 * Pixel size behind a ratio option value.
 * @param value - an option value from `comfyUIStudioProfiles`, e.g. `2:3@1024x1536`.
 * @returns the size, or undefined for the placeholder row and foreign values.
 */
export declare function comfyUIStudioSize(value: string): ComfyUIDimensions | undefined;
/**
 * One workbench row per imported workflow, or a single unconfigured
 * placeholder row while nothing is imported, so the provider stays visible in
 * the status list instead of silently disappearing.
 * @param config - the plugin's live settings.
 * @returns the rows, in import order.
 */
export declare function comfyUIStudioProfiles(config: Config): StudioProviderProfile[];
/** One workbench row together with the workflow it runs. */
export interface ComfyUIStudioTarget {
    profile: StudioProviderProfile;
    workflow: ComfyUIWorkflowEntry;
}
/**
 * The row a request addresses. The row id names the workflow; a request that
 * carries only the base provider (a replayed gallery item, for instance) is
 * resolved through its model instead.
 * @param config - the plugin's live settings.
 * @param provider - workbench row id, e.g. `comfyui:anima-int8` or `comfyui`.
 * @param model - workflow name, used when the id carries none.
 * @returns the row and its workflow, or undefined when no workflow matches.
 */
export declare function comfyUIStudioTarget(config: Config, provider: string, model: string): ComfyUIStudioTarget | undefined;
/**
 * Run one workbench request against a ComfyUI workflow.
 * @param input - validated workbench request.
 * @param config - the plugin's live settings.
 * @param workflow - the imported workflow to run.
 * @param options - source image (edit mode), size override, byte cap, abort signal.
 * @returns the generated image plus the provenance line stored with it.
 */
export declare function runComfyUIStudio(input: StudioGenerateRequest, config: Config, workflow: ComfyUIWorkflowEntry, options: {
    size?: ComfyUIDimensions | undefined;
    sourceImage?: ComfyUISourceImage | undefined;
    maxBytes: number;
    signal: AbortSignal;
}): Promise<{
    data: Uint8Array;
    mediaType: ImageMediaType;
    output: string;
}>;
