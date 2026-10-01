import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProxyDispatcher, setSubscriptionProxyResolver, subscriptionFetch, subscriptionProxyUrl } from '../src/subscription/proxy.js'

/** Minimal stand-in for undici's EnvHttpProxyAgent. */
class FakeAgent {
  constructor(public readonly options: Record<string, string>) {}
}

afterEach(() => {
  setSubscriptionProxyResolver(() => '')
  vi.restoreAllMocks()
})

describe('createProxyDispatcher', () => {
  it('stays direct without a proxy URL', () => {
    expect(createProxyDispatcher('', { execArgv: ['--expose-internals'], load: () => ({ EnvHttpProxyAgent: FakeAgent }) })).toBeUndefined()
    expect(createProxyDispatcher('   ', { execArgv: ['--expose-internals'], load: () => ({ EnvHttpProxyAgent: FakeAgent }) })).toBeUndefined()
  })

  it('stays direct when the host was not started with --expose-internals', () => {
    const load = vi.fn(() => ({ EnvHttpProxyAgent: FakeAgent }))
    expect(createProxyDispatcher('http://127.0.0.1:10809', { execArgv: [], load })).toBeUndefined()
    expect(load).not.toHaveBeenCalled()
  })

  it('builds an agent from the host undici copy when internals are exposed', () => {
    const agent = createProxyDispatcher(' http://127.0.0.1:10809 ', { execArgv: ['--expose-internals'], load: id => ({ EnvHttpProxyAgent: FakeAgent, id }) })
    expect(agent).toBeInstanceOf(FakeAgent)
    expect((agent as FakeAgent).options).toEqual({ httpProxy: 'http://127.0.0.1:10809', httpsProxy: 'http://127.0.0.1:10809', noProxy: '' })
  })

  it('survives an undici copy that cannot be loaded', () => {
    expect(createProxyDispatcher('http://127.0.0.1:10809', { execArgv: ['--expose-internals'], load: () => { throw new Error('MODULE_NOT_FOUND') } })).toBeUndefined()
    expect(createProxyDispatcher('http://127.0.0.1:10809', { execArgv: ['--expose-internals'], load: () => ({}) })).toBeUndefined()
  })
})

describe('subscriptionFetch', () => {
  it('reads the proxy URL from the live config and trims it', () => {
    setSubscriptionProxyResolver(() => '  http://127.0.0.1:10809  ')
    expect(subscriptionProxyUrl()).toBe('http://127.0.0.1:10809')
  })

  it('passes requests through untouched while no proxy is configured', async () => {
    const seen: RequestInit[] = []
    vi.stubGlobal('fetch', (input: unknown, init?: RequestInit) => {
      seen.push(init ?? {})
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    const response = await subscriptionFetch('https://oauth2.googleapis.com/token', { method: 'POST' })
    expect(response.status).toBe(200)
    expect(seen).toHaveLength(1)
    expect(seen[0]).not.toHaveProperty('dispatcher')
  })

  it('also passes through when the proxy is configured but unreachable internals leave no dispatcher', async () => {
    const seen: RequestInit[] = []
    vi.stubGlobal('fetch', (input: unknown, init?: RequestInit) => {
      seen.push(init ?? {})
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    setSubscriptionProxyResolver(() => 'http://127.0.0.1:10809')
    await subscriptionFetch('https://oauth2.googleapis.com/token')
    expect(seen[0]).not.toHaveProperty('dispatcher')
  })
})
