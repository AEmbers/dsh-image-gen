/**
 * Host-backed settings scope for pages whose settings form stays process-local.
 *
 * DSH picks the settings-form persistence from the page origin. A loopback page
 * gets the host-backed form; every other origin — a LAN address or a public
 * hostname served through remote-web-ui — gets one whose reads stay empty and
 * whose `set()` answers `false` without a round trip, so the card looks
 * read-only and every edit reports "the setting could not be saved" while the
 * Host was never asked. Nothing is wrong on the Host side: the very same write
 * is accepted when it reaches `ctx.remote.settings` directly, which is the
 * namespace the host-backed form calls anyway.
 *
 * This scope is that call. It keeps the interface the card and the provider
 * pill consume (`getSnapshot` / `subscribe` / `set`), reads the entry through
 * `describe`, and applies field edits through `mutate` with the revision it
 * last saw. A conflict is answered by re-reading and applying once more, the
 * recovery the settings-controller documents for a stale writer.
 */

/** Failure code the Host answers a write with when its revision moved on. */
export const HOST_SETTINGS_CONFLICT = 'settings/conflict'

/** Snapshot shape the settings card and the provider pill read. */
export interface HostSettingsSnapshot<T> {
  value: T | undefined
  writable: boolean
}

/** Settings scope shape both surfaces consume. */
export interface HostSettingsScope<T> {
  getSnapshot(): HostSettingsSnapshot<T>
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<boolean>
  /** Adopt the Remote namespace and read the entry once. */
  attach(namespace: RemoteSettingsNamespace): void
  /** Re-read the entry; cheap enough to run on every host-side document event. */
  reload(): Promise<void>
}

/** One field edit as the settings namespace accepts it. */
export interface SettingsPathOp {
  op: 'set' | 'unset'
  path: (string | number)[]
  value?: unknown
}

/** One namespace row of a describe answer. */
export interface RemoteNamespaceView {
  ns: string
  value: unknown
  revision?: number
}

/** Envelope every Remote call answers with. */
export interface RemoteResponse<T> {
  ok: boolean
  value?: T
  error?: { code?: string, message?: string }
}

/** The `remote.settings` namespace, narrowed to what a settings scope needs. */
export interface RemoteSettingsNamespace {
  describe(): Promise<RemoteResponse<{ namespaces: RemoteNamespaceView[], writable?: boolean }>>
  mutate(ns: string, ops: readonly SettingsPathOp[], expectedRevision?: number): Promise<RemoteResponse<RemoteNamespaceView>>
}

/**
 * Adopt the shared namespace only when it carries both halves of the contract.
 * Hosts older than the Remote settings namespace expose nothing here, and the
 * scope then keeps answering like a degraded one instead of throwing.
 * @param value - whatever `ctx.get('remote.settings')` resolved.
 * @returns the namespace, or undefined when this host does not serve one.
 */
export function asRemoteSettingsNamespace(value: unknown): RemoteSettingsNamespace | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Partial<RemoteSettingsNamespace>
  return typeof candidate.describe === 'function' && typeof candidate.mutate === 'function'
    ? candidate as RemoteSettingsNamespace
    : undefined
}

/**
 * Build one entry's host-backed scope.
 * @param entryId - profile entry id the namespace describes, e.g. `image-gen`.
 * @returns the scope, inert until `attach` supplies the Remote namespace.
 */
export function createHostSettingsScope<T>(entryId: string): HostSettingsScope<T> {
  const listeners = new Set<() => void>()
  let snapshot: HostSettingsSnapshot<T> = { value: undefined, writable: false }
  let namespace: RemoteSettingsNamespace | undefined
  let revision: number | undefined
  let disposed = false

  const publish = (next: HostSettingsSnapshot<T>): void => {
    snapshot = next
    for (const listener of [...listeners]) listener()
  }

  /** Fold one namespace view in; an unknown revision leaves the fence unset. */
  const adopt = (view: RemoteNamespaceView | undefined, writable: boolean | undefined): void => {
    if (view === undefined) return
    revision = typeof view.revision === 'number' ? view.revision : undefined
    publish({ value: view.value as T, writable: writable !== false })
  }

  /** Read once; a failed or superseded read keeps the last published value. */
  const read = async (): Promise<void> => {
    const client = namespace
    if (client === undefined || disposed) return
    try {
      const response = await client.describe()
      if (client !== namespace || disposed || !response.ok || response.value === undefined) return
      adopt(response.value.namespaces.find(row => row.ns === entryId), response.value.writable)
    } catch {
      // A transport failure leaves the last value in place; the next document
      // event or read retries, and a write still reports its own outcome.
    }
  }

  /** Apply one field edit, retrying once after a conflict with the fresh revision. */
  const write = async (field: string, value: unknown): Promise<boolean> => {
    const client = namespace
    if (client === undefined || disposed) return false
    const ops: SettingsPathOp[] = [{ op: 'set', path: [field], value }]
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const fence = revision
        const response = await client.mutate(entryId, ops, fence)
        if (disposed) return false
        if (response.ok && response.value !== undefined) {
          adopt(response.value, true)
          return true
        }
        if (response.error?.code !== HOST_SETTINGS_CONFLICT || attempt === 1) break
        // The Host refused a stale revision: re-read, then apply the edit again
        // against what the Host now holds.
        await read()
        if (revision === fence) break
      }
    } catch {
      // Fall through to the re-read below so the UI shows host state, not the
      // value it optimistically typed.
    }
    await read()
    return false
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: write,
    attach(next: RemoteSettingsNamespace): void {
      namespace = next
      void read()
    },
    async reload(): Promise<void> {
      await read()
    },
  }
}
