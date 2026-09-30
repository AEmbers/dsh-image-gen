/** Pure ComfyUI API-workflow validation and placeholder injection. */
import { MAX_COMFYUI_WORKFLOW_BYTES } from './shared.js'

export const COMFYUI_PROMPT_PLACEHOLDER = '{{prompt}}'
export const COMFYUI_SEED_PLACEHOLDER = '{{seed}}'
export const COMFYUI_IMAGE_PLACEHOLDER = '{{image}}'

/** Legacy single-percent placeholders from early releases, still accepted. */
const LEGACY_PROMPT_PLACEHOLDER = '%prompt%'
const LEGACY_SEED_PLACEHOLDER = '%seed%'
const LEGACY_IMAGE_PLACEHOLDER = '%image%'

/** LoadImage-style input key that receives the uploaded source image name. */
const IMAGE_INPUT_KEY = 'image'

type JsonRecord = Record<string, unknown>

/** Validate imported JSON without exposing workflow graph details to callers. */
export function validateComfyUIWorkflowJson(workflowJson: string): void {
  const workflow = parseWorkflow(workflowJson)
  const imageInputs = countImagePlaceholders(workflow)
  if (imageInputs > 1) {
    throw new Error(`ComfyUI workflow must contain at most one ${COMFYUI_IMAGE_PLACEHOLDER} image input; found ${String(imageInputs)}`)
  }
}

/**
 * Parse, clone, and inject one prompt plus an optional randomized seed.
 *
 * Prompt and seed placeholders are replaced inside any string so existing
 * workflows that embed them in longer text keep working. The image
 * placeholder is stricter: it only matches a dedicated `inputs.image` field
 * whose value is exactly the placeholder, and at most one may exist, because
 * the field must carry a single uploaded file name.
 */
export function prepareComfyUIWorkflow(workflowJson: string, prompt: string, seed = randomSeed(), image?: string): JsonRecord {
  const workflow = parseWorkflow(workflowJson)
  let promptReplacements = 0

  const inject = (value: unknown): unknown => {
    if (typeof value === 'string') {
      let replaced = value
      if (replaced.includes(COMFYUI_PROMPT_PLACEHOLDER) || replaced.includes(LEGACY_PROMPT_PLACEHOLDER)) {
        promptReplacements += 1
        replaced = replaced
          .replaceAll(COMFYUI_PROMPT_PLACEHOLDER, prompt)
          .replaceAll(LEGACY_PROMPT_PLACEHOLDER, prompt)
      }
      if (replaced === COMFYUI_SEED_PLACEHOLDER || replaced === LEGACY_SEED_PLACEHOLDER) return seed
      if (replaced.includes(COMFYUI_SEED_PLACEHOLDER) || replaced.includes(LEGACY_SEED_PLACEHOLDER)) {
        replaced = replaced
          .replaceAll(COMFYUI_SEED_PLACEHOLDER, String(seed))
          .replaceAll(LEGACY_SEED_PLACEHOLDER, String(seed))
      }
      return replaced
    }
    if (Array.isArray(value)) return value.map(inject)
    if (!isRecord(value)) return value
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, inject(child)]))
  }

  let imageInputs = 0
  const prepared = Object.fromEntries(Object.entries(workflow).map(([nodeId, value]) => {
    const node = record(value)
    const inputs = node === undefined ? undefined : record(node.inputs)
    if (inputs === undefined) return [nodeId, value]
    const nextInputs = inject(inputs) as JsonRecord
    if (isImagePlaceholder(nextInputs[IMAGE_INPUT_KEY])) {
      imageInputs += 1
      if (image !== undefined) nextInputs[IMAGE_INPUT_KEY] = image
    }
    return [nodeId, { ...node, inputs: nextInputs }]
  }))
  if (promptReplacements === 0) {
    throw new Error(`ComfyUI workflow must contain ${COMFYUI_PROMPT_PLACEHOLDER} in a text input`)
  }
  if (image === undefined) {
    if (imageInputs > 0) {
      throw new Error(`ComfyUI workflow contains an ${COMFYUI_IMAGE_PLACEHOLDER} image input, which requires edit_image with a source image`)
    }
    return prepared
  }
  if (imageInputs === 0) {
    throw new Error(`ComfyUI workflow must contain exactly one ${COMFYUI_IMAGE_PLACEHOLDER} image input to edit images`)
  }
  if (imageInputs > 1) {
    throw new Error(`ComfyUI workflow must contain exactly one ${COMFYUI_IMAGE_PLACEHOLDER} image input; found ${String(imageInputs)}`)
  }
  return prepared
}

/** Random seed in the 32-bit range ComfyUI samplers accept. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x1_0000_0000)
}

/** Pixel size one workflow renders at. */
export interface ComfyUIDimensions {
  width: number
  height: number
}

/** Sampler settings a workflow ships with. */
export interface ComfyUISamplerSettings {
  steps?: number
  cfg?: number
  sampler?: string
  scheduler?: string
}

/**
 * What one imported workflow exposes to the workbench: the output size the
 * latent node declares, the sampler it already runs, and whether it accepts a
 * source image. All of it is read out of the graph, never assumed.
 */
export interface ComfyUIWorkflowSurface {
  /** Size of the first resizable node; absent when the graph carries none. */
  size?: ComfyUIDimensions
  /** How many nodes hold their own `width`/`height` inputs. */
  resizableNodes: number
  /** Settings of the first sampler node, for the quality label. */
  sampler: ComfyUISamplerSettings
  /** `{{image}}` placeholders: more than zero means the workflow edits images. */
  imageInputs: number
}

/**
 * Read the workbench-facing surface of one workflow.
 * @param workflowJson - API-format JSON, already validated by the importer.
 * @returns the derived surface; an unparsable graph throws like `prepareComfyUIWorkflow`.
 */
export function comfyUIWorkflowSurface(workflowJson: string): ComfyUIWorkflowSurface {
  const workflow = parseWorkflow(workflowJson)
  const surface: ComfyUIWorkflowSurface = {
    resizableNodes: 0,
    sampler: {},
    imageInputs: countImagePlaceholders(workflow),
  }
  for (const node of Object.values(workflow)) {
    const record_ = record(node)
    const inputs = record(record_?.inputs)
    if (inputs === undefined) continue
    const width = positiveInteger(inputs.width)
    const height = positiveInteger(inputs.height)
    if (width !== undefined && height !== undefined) {
      surface.resizableNodes += 1
      surface.size ??= { width, height }
    }
    if (surface.sampler.steps === undefined && typeof record_?.class_type === 'string' && record_.class_type.toLowerCase().includes('ksampler')) {
      surface.sampler = samplerSettings(inputs)
    }
  }
  return surface
}

/**
 * Write one size into every latent node of a prepared workflow.
 * @param workflow - parsed API-format workflow, already prompt/seed injected.
 * @param size - target dimensions in pixels.
 * @returns how many nodes were resized; 0 means this workflow has no size of
 * its own to override, so the caller must render it as authored.
 */
export function resizeComfyUIWorkflow(workflow: JsonRecord, size: ComfyUIDimensions): number {
  let resized = 0
  for (const [nodeId, value] of Object.entries(workflow)) {
    const node = record(value)
    const inputs = node === undefined ? undefined : record(node.inputs)
    if (node === undefined || inputs === undefined) continue
    if (positiveInteger(inputs.width) === undefined || positiveInteger(inputs.height) === undefined) continue
    workflow[nodeId] = { ...node, inputs: { ...inputs, width: size.width, height: size.height } }
    resized += 1
  }
  return resized
}

function samplerSettings(inputs: JsonRecord): ComfyUISamplerSettings {
  const steps = positiveInteger(inputs.steps)
  const cfg = typeof inputs.cfg === 'number' && Number.isFinite(inputs.cfg) && inputs.cfg > 0 ? inputs.cfg : undefined
  const sampler = typeof inputs.sampler_name === 'string' && inputs.sampler_name.length > 0 ? inputs.sampler_name : undefined
  const scheduler = typeof inputs.scheduler === 'string' && inputs.scheduler.length > 0 ? inputs.scheduler : undefined
  return {
    ...(steps === undefined ? {} : { steps }),
    ...(cfg === undefined ? {} : { cfg }),
    ...(sampler === undefined ? {} : { sampler }),
    ...(scheduler === undefined ? {} : { scheduler }),
  }
}

/** A whole positive number, or undefined for anything else. */
function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

function parseWorkflow(workflowJson: string): JsonRecord {
  if (workflowJson.trim().length === 0) throw new Error('Import a ComfyUI API workflow JSON file in Settings before generating')
  if (new TextEncoder().encode(workflowJson).byteLength > MAX_COMFYUI_WORKFLOW_BYTES) {
    throw new Error('ComfyUI workflow file must be no larger than 5 MB')
  }
  let value: unknown
  try {
    value = JSON.parse(workflowJson)
  } catch {
    throw new Error('ComfyUI workflow file is not valid JSON')
  }
  if (!isRecord(value) || Object.keys(value).length === 0) {
    throw new Error('ComfyUI workflow must be a non-empty API-format JSON object')
  }
  if (!Object.values(value).some(node => {
    const inputs = record(node)?.inputs
    return inputs !== undefined && containsPromptPlaceholder(inputs)
  })) {
    throw new Error(`ComfyUI workflow must contain ${COMFYUI_PROMPT_PLACEHOLDER} (or ${LEGACY_PROMPT_PLACEHOLDER}) in a text input`)
  }
  return value
}

/** Count `inputs.image` fields that are exactly an image placeholder. */
function countImagePlaceholders(workflow: JsonRecord): number {
  let count = 0
  for (const node of Object.values(workflow)) {
    const inputs = record(record(node)?.inputs)
    if (inputs !== undefined && isImagePlaceholder(inputs[IMAGE_INPUT_KEY])) count += 1
  }
  return count
}

function isImagePlaceholder(value: unknown): boolean {
  return value === COMFYUI_IMAGE_PLACEHOLDER || value === LEGACY_IMAGE_PLACEHOLDER
}

function containsPromptPlaceholder(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.includes(COMFYUI_PROMPT_PLACEHOLDER) || value.includes(LEGACY_PROMPT_PLACEHOLDER)
  }
  if (Array.isArray(value)) return value.some(containsPromptPlaceholder)
  return isRecord(value) && Object.values(value).some(containsPromptPlaceholder)
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown): JsonRecord | undefined {
  return isRecord(value) ? value : undefined
}
