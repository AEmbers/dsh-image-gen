export declare const COMFYUI_PROMPT_PLACEHOLDER = "{{prompt}}";
export declare const COMFYUI_SEED_PLACEHOLDER = "{{seed}}";
export declare const COMFYUI_IMAGE_PLACEHOLDER = "{{image}}";
type JsonRecord = Record<string, unknown>;
/** Validate imported JSON without exposing workflow graph details to callers. */
export declare function validateComfyUIWorkflowJson(workflowJson: string): void;
/**
 * Parse, clone, and inject one prompt plus an optional randomized seed.
 *
 * Prompt and seed placeholders are replaced inside any string so existing
 * workflows that embed them in longer text keep working. The image
 * placeholder is stricter: it only matches a dedicated `inputs.image` field
 * whose value is exactly the placeholder, and at most one may exist, because
 * the field must carry a single uploaded file name.
 */
export declare function prepareComfyUIWorkflow(workflowJson: string, prompt: string, seed?: number, image?: string): JsonRecord;
/** Random seed in the 32-bit range ComfyUI samplers accept. */
export declare function randomSeed(): number;
/** Pixel size one workflow renders at. */
export interface ComfyUIDimensions {
    width: number;
    height: number;
}
/** Sampler settings a workflow ships with. */
export interface ComfyUISamplerSettings {
    steps?: number;
    cfg?: number;
    sampler?: string;
    scheduler?: string;
}
/**
 * What one imported workflow exposes to the workbench: the output size the
 * latent node declares, the sampler it already runs, and whether it accepts a
 * source image. All of it is read out of the graph, never assumed.
 */
export interface ComfyUIWorkflowSurface {
    /** Size of the first resizable node; absent when the graph carries none. */
    size?: ComfyUIDimensions;
    /** How many nodes hold their own `width`/`height` inputs. */
    resizableNodes: number;
    /** Settings of the first sampler node, for the quality label. */
    sampler: ComfyUISamplerSettings;
    /** `{{image}}` placeholders: more than zero means the workflow edits images. */
    imageInputs: number;
}
/**
 * Read the workbench-facing surface of one workflow.
 * @param workflowJson - API-format JSON, already validated by the importer.
 * @returns the derived surface; an unparsable graph throws like `prepareComfyUIWorkflow`.
 */
export declare function comfyUIWorkflowSurface(workflowJson: string): ComfyUIWorkflowSurface;
/**
 * Write one size into every latent node of a prepared workflow.
 * @param workflow - parsed API-format workflow, already prompt/seed injected.
 * @param size - target dimensions in pixels.
 * @returns how many nodes were resized; 0 means this workflow has no size of
 * its own to override, so the caller must render it as authored.
 */
export declare function resizeComfyUIWorkflow(workflow: JsonRecord, size: ComfyUIDimensions): number;
export {};
