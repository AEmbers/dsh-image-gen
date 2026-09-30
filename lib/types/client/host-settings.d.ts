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
export declare const HOST_SETTINGS_CONFLICT = "settings/conflict";
/** Snapshot shape the settings card and the provider pill read. */
export interface HostSettingsSnapshot<T> {
    value: T | undefined;
    writable: boolean;
}
/** Settings scope shape both surfaces consume. */
export interface HostSettingsScope<T> {
    getSnapshot(): HostSettingsSnapshot<T>;
    subscribe(listener: () => void): () => void;
    set(field: string, value: unknown): Promise<boolean>;
    /** Adopt the Remote namespace and read the entry once. */
    attach(namespace: RemoteSettingsNamespace): void;
    /** Re-read the entry; cheap enough to run on every host-side document event. */
    reload(): Promise<void>;
}
/** One field edit as the settings namespace accepts it. */
export interface SettingsPathOp {
    op: 'set' | 'unset';
    path: (string | number)[];
    value?: unknown;
}
/** One namespace row of a describe answer. */
export interface RemoteNamespaceView {
    ns: string;
    value: unknown;
    revision?: number;
}
/** Envelope every Remote call answers with. */
export interface RemoteResponse<T> {
    ok: boolean;
    value?: T;
    error?: {
        code?: string;
        message?: string;
    };
}
/** The `remote.settings` namespace, narrowed to what a settings scope needs. */
export interface RemoteSettingsNamespace {
    describe(): Promise<RemoteResponse<{
        namespaces: RemoteNamespaceView[];
        writable?: boolean;
    }>>;
    mutate(ns: string, ops: readonly SettingsPathOp[], expectedRevision?: number): Promise<RemoteResponse<RemoteNamespaceView>>;
}
/**
 * Adopt the shared namespace only when it carries both halves of the contract.
 * Hosts older than the Remote settings namespace expose nothing here, and the
 * scope then keeps answering like a degraded one instead of throwing.
 * @param value - whatever `ctx.get('remote.settings')` resolved.
 * @returns the namespace, or undefined when this host does not serve one.
 */
export declare function asRemoteSettingsNamespace(value: unknown): RemoteSettingsNamespace | undefined;
/**
 * Build one entry's host-backed scope.
 * @param entryId - profile entry id the namespace describes, e.g. `image-gen`.
 * @returns the scope, inert until `attach` supplies the Remote namespace.
 */
export declare function createHostSettingsScope<T>(entryId: string): HostSettingsScope<T>;
