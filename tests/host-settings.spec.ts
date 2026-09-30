import { describe, expect, it, vi } from 'vitest'
import {
  asRemoteSettingsNamespace,
  createHostSettingsScope,
  type RemoteNamespaceView,
  type RemoteSettingsNamespace,
  type SettingsPathOp,
} from '../src/client/host-settings.js'

/** One namespace row of a describe answer. */
function view(value: Record<string, unknown>, revision: number): RemoteNamespaceView {
  return { ns: 'image-gen', value, revision }
}

/** A namespace that reads `comfyui` at revision 7 and writes `openai` at 8. */
function namespaceStub(overrides: Partial<RemoteSettingsNamespace> = {}): RemoteSettingsNamespace {
  return {
    describe: vi.fn(async () => ({ ok: true, value: { namespaces: [view({ provider: 'comfyui' }, 7)], writable: true } })),
    mutate: vi.fn(async (
      _ns: string,
      _ops: readonly SettingsPathOp[],
      _expectedRevision?: number,
    ) => ({ ok: true, value: view({ provider: 'openai' }, 8) })),
    ...overrides,
  }
}

interface Settings { provider?: string }

describe('host-backed settings scope', () => {
  it('stays inert until a Host namespace is attached', async () => {
    const scope = createHostSettingsScope<Settings>('image-gen')
    expect(scope.getSnapshot()).toEqual({ value: undefined, writable: false })
    await expect(scope.set('provider', 'google')).resolves.toBe(false)
    await expect(scope.reload()).resolves.toBeUndefined()
  })

  it('publishes the entry it read to subscribers', async () => {
    const scope = createHostSettingsScope<Settings>('image-gen')
    const listener = vi.fn()
    scope.subscribe(listener)
    scope.attach(namespaceStub())
    await scope.reload()
    expect(scope.getSnapshot()).toEqual({ value: { provider: 'comfyui' }, writable: true })
    expect(listener).toHaveBeenCalled()
  })

  it('applies a field edit against the revision it last read', async () => {
    const namespace = namespaceStub()
    const scope = createHostSettingsScope<Settings>('image-gen')
    scope.attach(namespace)
    await scope.reload()

    await expect(scope.set('provider', 'openai')).resolves.toBe(true)

    expect(namespace.mutate).toHaveBeenCalledWith('image-gen', [{ op: 'set', path: ['provider'], value: 'openai' }], 7)
    expect(scope.getSnapshot()).toEqual({ value: { provider: 'openai' }, writable: true })
  })

  it('re-reads and re-applies once when the Host answers a stale revision', async () => {
    let revision = 8
    let first = true
    const mutate = vi.fn(async (
      _ns: string,
      _ops: readonly SettingsPathOp[],
      _expectedRevision?: number,
    ) => {
      if (first) {
        first = false
        revision = 9
        return { ok: false, error: { code: 'settings/conflict', message: 'stale revision' } }
      }
      return { ok: true, value: view({ provider: 'openai' }, revision) }
    })
    const describe = vi.fn(async () => ({
      ok: true,
      value: { namespaces: [view({ provider: 'google' }, revision)], writable: true },
    }))
    const scope = createHostSettingsScope<Settings>('image-gen')
    scope.attach(namespaceStub({ mutate, describe }))
    await scope.reload()

    await expect(scope.set('provider', 'openai')).resolves.toBe(true)

    expect(mutate).toHaveBeenCalledTimes(2)
    expect(mutate.mock.calls[0]?.[2]).toBe(8)
    expect(mutate.mock.calls[1]?.[2]).toBe(9)
    expect(scope.getSnapshot().value).toEqual({ provider: 'openai' })
  })

  it('reports a rejected write and republishes host state', async () => {
    const describe = vi.fn(async () => ({
      ok: true,
      value: { namespaces: [view({ provider: 'google' }, 3)], writable: true },
    }))
    const mutate = vi.fn(async () => ({ ok: false, error: { code: 'settings/rejected', message: 'not volatile' } }))
    const scope = createHostSettingsScope<Settings>('image-gen')
    scope.attach(namespaceStub({ describe, mutate }))
    await scope.reload()

    await expect(scope.set('provider', 'openai')).resolves.toBe(false)

    expect(scope.getSnapshot().value).toEqual({ provider: 'google' })
  })

  it('keeps the last value when a read fails', async () => {
    const describe = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: { namespaces: [view({ provider: 'comfyui' }, 4)], writable: true } })
      .mockRejectedValueOnce(new Error('transport closed'))
    const scope = createHostSettingsScope<Settings>('image-gen')
    scope.attach(namespaceStub({ describe }))
    await scope.reload()
    await scope.reload()
    expect(scope.getSnapshot()).toEqual({ value: { provider: 'comfyui' }, writable: true })
  })

  it('ignores a namespace the entry is absent from', async () => {
    const describe = vi.fn(async () => ({ ok: true, value: { namespaces: [view({ provider: 'comfyui' }, 1)], writable: true } }))
    const scope = createHostSettingsScope<Settings>('other-entry')
    scope.attach(namespaceStub({ describe }))
    await scope.reload()
    expect(scope.getSnapshot()).toEqual({ value: undefined, writable: false })
  })
})

describe('remote settings namespace probe', () => {
  it('accepts only an object carrying both halves of the contract', () => {
    expect(asRemoteSettingsNamespace(undefined)).toBeUndefined()
    expect(asRemoteSettingsNamespace({})).toBeUndefined()
    expect(asRemoteSettingsNamespace({ describe: () => {} })).toBeUndefined()
    const namespace = namespaceStub()
    expect(asRemoteSettingsNamespace(namespace)).toBe(namespace)
  })
})
