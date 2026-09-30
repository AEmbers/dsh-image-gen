import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Config } from '../src/config.js'
import { comfyUIWorkflowSurface, prepareComfyUIWorkflow, resizeComfyUIWorkflow } from '../src/comfyui-workflow.js'
import { comfyUIStudioProfiles, comfyUIStudioSize, comfyUIStudioTarget, runComfyUIStudio } from '../src/comfyui-studio.js'
import type { StudioGenerateRequest } from '../src/shared.js'

/** A graph shaped like a real Anima workflow: preset prompt, latents and sampler. */
const ANIMA = JSON.stringify({
  11: { class_type: 'CLIPTextEncode', inputs: { text: '{{prompt}}', clip: ['45', 0] } },
  19: {
    class_type: 'KSampler',
    inputs: {
      seed: '{{seed}}',
      steps: 28,
      cfg: 3,
      sampler_name: 'euler_ancestral',
      scheduler: 'simple',
      model: ['44', 0],
    },
  },
  28: { class_type: 'EmptyLatentImage', inputs: { width: 832, height: 1216, batch_size: 1 } },
})

/** The same graph with a source-image input and a distilled sampler. */
const IMG2IMG = JSON.stringify({
  1: { class_type: 'LoadImage', inputs: { image: '{{image}}' } },
  11: { class_type: 'CLIPTextEncode', inputs: { text: '{{prompt}}' } },
  19: { class_type: 'KSampler', inputs: { seed: '{{seed}}', steps: 8, cfg: 1, sampler_name: 'euler' } },
})

function config(overrides: Partial<Config> = {}): Config {
  return {
    comfyuiWorkflows: [
      { name: 'anima-int8', json: ANIMA, presetPrompt: 'masterpiece' },
      { name: 'anima-edit', json: IMG2IMG },
    ],
    comfyuiActiveWorkflow: 'anima-int8',
    comfyuiBaseURL: 'http://127.0.0.1:8188',
    comfyuiTimeoutMs: 5_000,
    ...overrides,
  }
}

function request(overrides: Partial<StudioGenerateRequest> = {}): StudioGenerateRequest {
  return {
    mode: 'generate',
    provider: 'comfyui:anima-int8',
    model: 'anima-int8',
    prompt: 'a silver-haired cat girl',
    ratio: 'auto@832x1216',
    quality: 'workflow',
    ...overrides,
  }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('ComfyUI workflow surface', () => {
  it('reads the latent size and sampler out of the graph', () => {
    expect(comfyUIWorkflowSurface(ANIMA)).toEqual({
      size: { width: 832, height: 1216 },
      resizableNodes: 1,
      sampler: { steps: 28, cfg: 3, sampler: 'euler_ancestral', scheduler: 'simple' },
      imageInputs: 0,
    })
  })

  it('reports a workflow without a latent node as unsizable', () => {
    const surface = comfyUIWorkflowSurface(IMG2IMG)
    expect(surface.size).toBeUndefined()
    expect(surface.resizableNodes).toBe(0)
    expect(surface.imageInputs).toBe(1)
    expect(surface.sampler).toEqual({ steps: 8, cfg: 1, sampler: 'euler' })
  })

  it('resizes every latent node of a prepared workflow', () => {
    const prepared = prepareComfyUIWorkflow(ANIMA, 'a red panda', 7)
    expect(resizeComfyUIWorkflow(prepared, { width: 1024, height: 1024 })).toBe(1)
    expect(prepared['28']).toMatchObject({ inputs: { width: 1024, height: 1024, batch_size: 1 } })
    expect(resizeComfyUIWorkflow(prepareComfyUIWorkflow(IMG2IMG, 'x', 1, 'source.png'), { width: 512, height: 512 })).toBe(0)
  })
})

describe('ComfyUI workbench rows', () => {
  it('turns each imported workflow into its own row', () => {
    const rows = comfyUIStudioProfiles(config())
    expect(rows.map(row => row.provider)).toEqual(['comfyui:anima-int8', 'comfyui:anima-edit'])

    const anima = rows[0]!
    expect(anima).toMatchObject({
      label: '本地 ComfyUI · anima-int8',
      model: 'anima-int8',
      configured: true,
      supportsEditing: false,
      defaultRatio: 'auto@832x1216',
      defaultQuality: 'workflow',
    })
    // The graph's own size leads, then the same pixel budget re-shaped.
    expect(anima.ratioOptions[0]).toEqual({ value: 'auto@832x1216', label: '工作流默认 · 832×1216' })
    expect(anima.ratioOptions.map(option => option.value)).toContain('1:1@1008x1008')
    expect(anima.qualityOptions).toEqual([{ value: 'workflow', label: '工作流默认（28 步 · CFG 3 · euler_ancestral）' }])

    const edit = rows[1]!
    expect(edit).toMatchObject({ supportsEditing: true, defaultRatio: 'workflow' })
    expect(edit.ratioOptions).toEqual([{ value: 'workflow', label: '工作流默认' }])
    expect(edit.qualityOptions).toEqual([{ value: 'workflow', label: '工作流默认（8 步 · CFG 1 · euler）' }])
  })

  it('keeps one visible, unconfigured row while nothing is imported', () => {
    const rows = comfyUIStudioProfiles(config({ comfyuiWorkflows: [] }))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ provider: 'comfyui', label: '本地 ComfyUI', model: '', configured: false, supportsEditing: false })
  })

  it('marks an unreadable graph as unconfigured instead of hiding it', () => {
    const rows = comfyUIStudioProfiles(config({
      comfyuiWorkflows: [{ name: 'broken', json: JSON.stringify({ 1: { class_type: 'SaveImage', inputs: { text: 'no placeholder' } } }) }],
    }))
    expect(rows[0]).toMatchObject({ provider: 'comfyui:broken', configured: false })
  })

  it('resolves a row from its id, its model, or the configured default', () => {
    expect(comfyUIStudioTarget(config(), 'comfyui:anima-edit', '')?.workflow.name).toBe('anima-edit')
    expect(comfyUIStudioTarget(config(), 'comfyui', 'anima-edit')?.workflow.name).toBe('anima-edit')
    expect(comfyUIStudioTarget(config(), 'comfyui', '')?.workflow.name).toBe('anima-int8')
    expect(comfyUIStudioTarget(config(), 'comfyui', 'missing')).toBeUndefined()
  })

  it('reads the size back out of a ratio option value', () => {
    expect(comfyUIStudioSize('1:1@1008x1008')).toEqual({ width: 1008, height: 1008 })
    expect(comfyUIStudioSize('auto@832x1216')).toEqual({ width: 832, height: 1216 })
    expect(comfyUIStudioSize('workflow')).toBeUndefined()
  })
})

describe('ComfyUI workbench generation', () => {
  /**
   * Stub the three calls one ComfyUI job makes, in order.
   * @returns the fetch mock, whose calls expose the submitted graph.
   */
  function comfyServer(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ prompt_id: 'job-1' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        'job-1': {
          status: { status_str: 'success', completed: true },
          outputs: { 1: { images: [{ filename: 'final.png', subfolder: '', type: 'output' }] } },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/png' } }))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('merges the workflow preset with the prompt and reports the injected size', async () => {
    const fetchMock = comfyServer()
    const target = comfyUIStudioTarget(config(), 'comfyui:anima-int8', '')!
    const generated = await runComfyUIStudio(request({ ratio: '1:1@1008x1008' }), config(), target.workflow, {
      size: comfyUIStudioSize('1:1@1008x1008'),
      maxBytes: 1024 * 1024,
      signal: new AbortController().signal,
    })

    expect(generated).toMatchObject({ data: new Uint8Array([1, 2, 3]), mediaType: 'image/png' })
    expect(generated.output).toMatch(/^1008×1008 · seed \d+$/)
    const submitted = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body)) as {
      prompt: Record<string, { inputs: Record<string, unknown> }>
    }
    expect(submitted.prompt['11']?.inputs.text).toBe('masterpiece, a silver-haired cat girl')
    expect(submitted.prompt['28']?.inputs).toMatchObject({ width: 1008, height: 1008 })
    expect(typeof submitted.prompt['19']?.inputs.seed).toBe('number')
  })

  it('uploads the single source image for an edit workflow', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: 'upload.png', subfolder: 'dsh' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ prompt_id: 'job-2' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        'job-2': {
          status: { status_str: 'success', completed: true },
          outputs: { 1: { images: [{ filename: 'final.png', subfolder: '', type: 'output' }] } },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([9]), { status: 200, headers: { 'content-type': 'image/png' } }))
    vi.stubGlobal('fetch', fetchMock)

    const target = comfyUIStudioTarget(config(), 'comfyui:anima-edit', '')!
    const generated = await runComfyUIStudio(
      request({ mode: 'edit', provider: 'comfyui:anima-edit', model: 'anima-edit', ratio: 'workflow' }),
      config(),
      target.workflow,
      {
        sourceImage: { data: new Uint8Array([1, 2, 3]), mediaType: 'image/png' },
        maxBytes: 1024 * 1024,
        signal: new AbortController().signal,
      },
    )

    expect(generated.output).toMatch(/^工作流默认 · seed \d+$/)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://127.0.0.1:8188/upload/image')
    const submitted = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.body)) as {
      prompt: Record<string, { inputs: Record<string, unknown> }>
    }
    expect(submitted.prompt['1']?.inputs.image).toBe('dsh/upload.png')
  })
})
