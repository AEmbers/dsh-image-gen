import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Packaging invariants for the published tarball.
 *
 * The client bundle inlines every dependency except its declared externals,
 * so tldraw/lucide-react must stay out of `dependencies`: declaring them
 * there makes consumers download ~150 packages the bundle never loads.
 * The guard test fails as soon as host-side (non-bundled) source starts
 * importing one of them, which is the only way the devDependency move
 * could silently break a release.
 */

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const BUNDLED_ONLY = ['tldraw', 'lucide-react']

function hostSources(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...hostSources(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full)
    }
  }
  return files
}

describe('package manifest', () => {
  it('keeps the client-bundled libraries out of runtime dependencies', () => {
    for (const name of BUNDLED_ONLY) {
      expect(pkg.dependencies ?? {}, `'${name}' is inlined into lib/client.js and must not ship as a runtime dependency`).not.toHaveProperty(name)
      expect(pkg.devDependencies).toHaveProperty(name)
    }
  })

  it('does not publish the client source map', () => {
    expect(pkg.files).not.toContain('lib/client.js.map')
  })
})

describe('host sources', () => {
  // src/client/** is bundled by tsdown; everything under src/ except it runs
  // from node_modules at runtime and may only import what the published
  // package actually declares.
  const sources = hostSources(join(root, 'src')).filter(file => !file.includes(`${join('src', 'client')}`))

  it('covers the non-bundled sources', () => {
    expect(sources.length).toBeGreaterThan(5)
  })

  for (const name of BUNDLED_ONLY) {
    it(`does not import '${name}'`, () => {
      const importers = sources.filter(file => {
        const code = readFileSync(file, 'utf8')
        return new RegExp(`(?:from|require\\()\\s*['"]${name}(?:/[^'"]*)?['"]`).test(code)
      })
      expect(importers).toEqual([])
    })
  }
})
