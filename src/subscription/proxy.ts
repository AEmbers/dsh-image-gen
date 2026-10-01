/** Route only the subscription flows through an HTTP proxy, leaving every other request direct. */
import { createRequire } from 'node:module'

/** Minimal shape of the undici dispatcher a request can carry. */
export type ProxyDispatcher = object

/** Injection seams so the dispatcher factory stays testable without internals. */
export interface ProxyDispatcherOptions {
  /** Node argv checked for `--expose-internals`; defaults to the running process. */
  execArgv?: readonly string[]
  /** Module loader used to reach undici's internal copy; defaults to `createRequire`. */
  load?: (id: string) => unknown
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
export function createProxyDispatcher(url: string, options: ProxyDispatcherOptions = {}): ProxyDispatcher | undefined {
  if (url.trim().length === 0) return undefined
  const execArgv = options.execArgv ?? process.execArgv
  if (!execArgv.includes('--expose-internals')) return undefined
  try {
    const load = options.load ?? ((id: string) => createRequire(import.meta.url)(id) as unknown)
    const undici = load('node:internal/deps/undici/undici') as {
      EnvHttpProxyAgent?: new (options: { httpProxy: string, httpsProxy: string, noProxy: string }) => ProxyDispatcher
    } | undefined
    if (typeof undici?.EnvHttpProxyAgent !== 'function') return undefined
    // An empty noProxy is what keeps the agent from inheriting ambient NO_PROXY
    // entries; the caller decides the scope by choosing the proxy URL alone.
    return new undici.EnvHttpProxyAgent({ httpProxy: url.trim(), httpsProxy: url.trim(), noProxy: '' })
  } catch {
    return undefined
  }
}

let readProxyUrl: () => string = () => ''
let cached: { url: string, dispatcher: ProxyDispatcher | undefined } | undefined

/** Read the proxy URL live from the plugin config on every request. */
export function setSubscriptionProxyResolver(resolver: () => string): void {
  readProxyUrl = resolver
  cached = undefined
}

/** The proxy URL the next subscription request would use; empty means direct. */
export function subscriptionProxyUrl(): string {
  return readProxyUrl().trim()
}

function dispatcherFor(url: string): ProxyDispatcher | undefined {
  if (cached?.url !== url) cached = { url, dispatcher: createProxyDispatcher(url) }
  return cached.dispatcher
}

/**
 * `fetch` for OAuth token exchange and vendor API calls.
 *
 * Every other request in the host keeps using the global `fetch` untouched:
 * the dispatcher is attached to these calls only. The signature matches
 * `typeof fetch`, so it is a drop-in replacement for the vendor seams.
 */
export const subscriptionFetch: typeof fetch = (input, init) => {
  const url = subscriptionProxyUrl()
  if (url.length === 0) return fetch(input, init)
  const dispatcher = dispatcherFor(url)
  if (dispatcher === undefined) return fetch(input, init)
  return fetch(input, { ...init, dispatcher } as RequestInit & { dispatcher: ProxyDispatcher })
}
