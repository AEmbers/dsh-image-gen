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
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { Config } from './config.js'
import { editComfyUIImage, generateComfyUIImage, type ComfyUISourceImage } from './comfyui.js'
import { comfyUIWorkflowSurface, type ComfyUIDimensions, type ComfyUISamplerSettings } from './comfyui-workflow.js'
import {
  DEFAULT_COMFYUI_BASE_URL,
  DEFAULT_COMFYUI_TIMEOUT_MS,
  activeComfyUIWorkflow,
  comfyUIStudioProvider,
  comfyUIStudioWorkflow,
  mergeComfyUIPrompt,
  resolveComfyUIWorkflows,
  type ComfyUIWorkflowEntry,
  type StudioGenerateRequest,
  type StudioOption,
  type StudioProviderProfile,
} from './shared.js'

/** Label prefix every ComfyUI workbench row shares. */
export const COMFYUI_STUDIO_LABEL = '本地 ComfyUI'

/** Value of the quality option: the workflow runs its own sampler settings. */
export const COMFYUI_STUDIO_QUALITY = 'workflow'

/** Ratio option value of the graph's own size, e.g. `auto@832x1216`. */
const WORKFLOW_SIZE_PREFIX = 'auto@'

/**
 * Ratios a workflow can be re-shaped to. Deliberately a small ladder: each
 * entry is one click, and every one keeps the graph's pixel budget.
 */
const RATIO_LADDER = ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9'] as const

/** Edge alignment ComfyUI latent sizes are happiest with. */
const EDGE_ALIGNMENT = 16

/** Smallest edge a re-shaped workflow will be rendered at. */
const MIN_EDGE = 256

/**
 * Pixel size behind a ratio option value.
 * @param value - an option value from `comfyUIStudioProfiles`, e.g. `2:3@1024x1536`.
 * @returns the size, or undefined for the placeholder row and foreign values.
 */
export function comfyUIStudioSize(value: string): ComfyUIDimensions | undefined {
  const match = /@(\d+)x(\d+)$/.exec(value.trim())
  if (match === null) return undefined
  const width = Number(match[1])
  const height = Number(match[2])
  return width > 0 && height > 0 ? { width, height } : undefined
}

/**
 * One workbench row per imported workflow, or a single unconfigured
 * placeholder row while nothing is imported, so the provider stays visible in
 * the status list instead of silently disappearing.
 * @param config - the plugin's live settings.
 * @returns the rows, in import order.
 */
export function comfyUIStudioProfiles(config: Config): StudioProviderProfile[] {
  const workflows = resolveComfyUIWorkflows(config)
  if (workflows.length === 0) return [placeholderProfile()]
  return workflows.map(workflow => profileFor(workflow))
}

/** One workbench row together with the workflow it runs. */
export interface ComfyUIStudioTarget {
  profile: StudioProviderProfile
  workflow: ComfyUIWorkflowEntry
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
export function comfyUIStudioTarget(config: Config, provider: string, model: string): ComfyUIStudioTarget | undefined {
  const workflow = resolveWorkflow(config, provider, model)
  return workflow === undefined ? undefined : { profile: profileFor(workflow), workflow }
}

/**
 * Run one workbench request against a ComfyUI workflow.
 * @param input - validated workbench request.
 * @param config - the plugin's live settings.
 * @param workflow - the imported workflow to run.
 * @param options - source image (edit mode), size override, byte cap, abort signal.
 * @returns the generated image plus the provenance line stored with it.
 */
export async function runComfyUIStudio(
  input: StudioGenerateRequest,
  config: Config,
  workflow: ComfyUIWorkflowEntry,
  options: {
    size?: ComfyUIDimensions | undefined
    sourceImage?: ComfyUISourceImage | undefined
    maxBytes: number
    signal: AbortSignal
  },
): Promise<{ data: Uint8Array, mediaType: ImageMediaType, output: string }> {
  const job = {
    baseURL: config.comfyuiBaseURL ?? DEFAULT_COMFYUI_BASE_URL,
    timeoutMs: config.comfyuiTimeoutMs ?? DEFAULT_COMFYUI_TIMEOUT_MS,
    workflowJson: workflow.json,
    prompt: mergeComfyUIPrompt(workflow.presetPrompt, input.prompt),
    maxBytes: options.maxBytes,
    signal: options.signal,
    ...(options.size === undefined ? {} : { size: options.size }),
  }
  const result = input.mode === 'edit'
    ? await (async () => {
      const sourceImage = options.sourceImage
      if (sourceImage === undefined) throw new Error('ComfyUI 图生图需要一张参考图')
      return await editComfyUIImage({ ...job, sourceImage })
    })()
    : await generateComfyUIImage(job)
  return { data: result.data, mediaType: result.mediaType, output: provenance(options.size, result.seed) }
}

/** The workflow a row runs: its own name first, then the configured default. */
function resolveWorkflow(config: Config, provider: string, model: string): ComfyUIWorkflowEntry | undefined {
  const workflows = resolveComfyUIWorkflows(config)
  const fromId = comfyUIStudioWorkflow(provider) ?? ''
  const wanted = fromId.length > 0 ? fromId : model.trim()
  if (wanted.length === 0) return activeComfyUIWorkflow(config)
  return workflows.find(entry => entry.name === wanted)
}

/** Workbench row of one workflow, derived from its graph. */
function profileFor(workflow: ComfyUIWorkflowEntry): StudioProviderProfile {
  let surface: ReturnType<typeof comfyUIWorkflowSurface>
  try {
    surface = comfyUIWorkflowSurface(workflow.json)
  } catch {
    return brokenProfile(workflow)
  }
  const ratios = surface.size === undefined
    ? [{ value: COMFYUI_STUDIO_QUALITY, label: '工作流默认' }]
    : ratioOptionsFor(surface.size)
  return {
    provider: comfyUIStudioProvider(workflow.name),
    label: `${COMFYUI_STUDIO_LABEL} · ${workflow.name}`,
    model: workflow.name,
    configured: true,
    supportsEditing: surface.imageInputs > 0,
    ratioOptions: ratios,
    qualityOptions: [qualityOption(surface.sampler)],
    defaultRatio: ratios[0]?.value ?? COMFYUI_STUDIO_QUALITY,
    defaultQuality: COMFYUI_STUDIO_QUALITY,
  }
}

/** Row of a workflow whose graph cannot be read: visible, never selectable. */
function brokenProfile(workflow: ComfyUIWorkflowEntry): StudioProviderProfile {
  return {
    provider: comfyUIStudioProvider(workflow.name),
    label: `${COMFYUI_STUDIO_LABEL} · ${workflow.name}`,
    model: workflow.name,
    configured: false,
    supportsEditing: false,
    ratioOptions: [{ value: COMFYUI_STUDIO_QUALITY, label: '工作流默认' }],
    qualityOptions: [{ value: COMFYUI_STUDIO_QUALITY, label: '工作流默认' }],
    defaultRatio: COMFYUI_STUDIO_QUALITY,
    defaultQuality: COMFYUI_STUDIO_QUALITY,
  }
}

/** Row shown while no workflow is imported yet. */
function placeholderProfile(): StudioProviderProfile {
  return {
    provider: 'comfyui',
    label: COMFYUI_STUDIO_LABEL,
    model: '',
    configured: false,
    supportsEditing: false,
    ratioOptions: [{ value: COMFYUI_STUDIO_QUALITY, label: '先导入工作流' }],
    qualityOptions: [{ value: COMFYUI_STUDIO_QUALITY, label: '先导入工作流' }],
    defaultRatio: COMFYUI_STUDIO_QUALITY,
    defaultQuality: COMFYUI_STUDIO_QUALITY,
  }
}

/** The graph's own size first, then the same budget re-shaped to common ratios. */
function ratioOptionsFor(size: ComfyUIDimensions): StudioOption[] {
  const options: StudioOption[] = [{
    value: `${WORKFLOW_SIZE_PREFIX}${size.width}x${size.height}`,
    label: `工作流默认 · ${size.width}×${size.height}`,
  }]
  const area = size.width * size.height
  const own = ratioOf(size.width, size.height)
  for (const ratio of RATIO_LADDER) {
    if (ratio === own) continue
    const scaled = scaleToArea(ratio, area)
    if (scaled === undefined) continue
    options.push({ value: `${ratio}@${scaled.width}x${scaled.height}`, label: `${ratio} · ${scaled.width}×${scaled.height}` })
  }
  return options
}

/** Quality option naming the sampler the workflow already runs. */
function qualityOption(sampler: ComfyUISamplerSettings): StudioOption {
  const parts: string[] = []
  if (sampler.steps !== undefined) parts.push(`${String(sampler.steps)} 步`)
  if (sampler.cfg !== undefined) parts.push(`CFG ${String(sampler.cfg)}`)
  if (sampler.sampler !== undefined) parts.push(sampler.sampler)
  return {
    value: COMFYUI_STUDIO_QUALITY,
    label: parts.length > 0 ? `工作流默认（${parts.join(' · ')}）` : '工作流默认',
  }
}

/** Re-shape one ratio to the workflow's pixel budget, aligned for latent nodes. */
function scaleToArea(ratio: string, area: number): ComfyUIDimensions | undefined {
  const [rawWidth, rawHeight] = ratio.split(':')
  const ratioWidth = Number(rawWidth)
  const ratioHeight = Number(rawHeight)
  if (!Number.isFinite(ratioWidth) || !Number.isFinite(ratioHeight) || ratioWidth <= 0 || ratioHeight <= 0) return undefined
  const scale = Math.sqrt(area / (ratioWidth * ratioHeight))
  return {
    width: Math.max(MIN_EDGE, Math.round((ratioWidth * scale) / EDGE_ALIGNMENT) * EDGE_ALIGNMENT),
    height: Math.max(MIN_EDGE, Math.round((ratioHeight * scale) / EDGE_ALIGNMENT) * EDGE_ALIGNMENT),
  }
}

/** Reduced ratio string of one size, used only to skip a duplicate ladder entry. */
function ratioOf(width: number, height: number): string {
  const divisor = greatestCommonDivisor(width, height)
  return `${String(width / divisor)}:${String(height / divisor)}`
}

function greatestCommonDivisor(left: number, right: number): number {
  return right === 0 ? left : greatestCommonDivisor(right, left % right)
}

/** Provenance line stored with a workbench result. */
function provenance(size: ComfyUIDimensions | undefined, seed: number): string {
  const dimensions = size === undefined ? '工作流默认' : `${String(size.width)}×${String(size.height)}`
  return `${dimensions} · seed ${String(seed)}`
}
