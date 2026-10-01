/** Minimal shape of the undici dispatcher a request can carry. */
export type ProxyDispatcher = object;
/** Injection seams so the dispatcher factory stays testable without internals. */
export interface ProxyDispatcherOptions {
    /** Node argv checked for `--expose-internals`; defaults to the running process. */
    execArgv?: readonly string[];
    /** Module loader used to reach undici's internal copy; defaults to `createRequire`. */
    load?: (id: string) => unknown;
}
/**
 * Build an undici proxy dispatcher from Node's own undici copy.
 *
 * `node:internal/deps/undici/undici` is the very implementation behind the
 * global `fetch`, so an agent taken from there is accepted as a per-request
 * `dispatcher`; a separately installed undici would be a second copy and would
 * be rejected. Without `--expose-internals` the module is unreachable and this
 * returns `undefined`, which keeps every caller on its direct path.
 */
export declare function createProxyDispatcher(url: string, options?: ProxyDispatcherOptions): ProxyDispatcher | undefined;
/** Read the proxy URL live from the plugin config on every request. */
export declare function setSubscriptionProxyResolver(resolver: () => string): void;
/** The proxy URL the next subscription request would use; empty means direct. */
export declare function subscriptionProxyUrl(): string;
/**
 * `fetch` for OAuth token exchange and vendor API calls.
 *
 * Every other request in the host keeps using the global `fetch` untouched:
 * the dispatcher is attached to these calls only. The signature matches
 * `typeof fetch`, so it is a drop-in replacement for the vendor seams.
 */
export declare const subscriptionFetch: typeof fetch;
