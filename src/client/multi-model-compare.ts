import type { StudioOption, StudioProvider, StudioProviderProfile } from '../shared.js'

export interface ComparisonTarget {
  profile: StudioProviderProfile
  ratio: string
  quality: string
  adjusted: boolean
}

/** Map one shared output intent to settings accepted by every target model. */
export function buildComparisonTargets(
  profiles: readonly StudioProviderProfile[],
  selectedProviders: readonly StudioProvider[],
  ratio: string,
  quality: string,
): ComparisonTarget[] {
  const selected = new Set(selectedProviders)
  return profiles
    .filter(profile => profile.configured && selected.has(profile.provider))
    .map(profile => {
      const targetRatio = profile.ratioOptions.some(option => option.value === ratio) ? ratio : profile.defaultRatio
      const targetQuality = profile.qualityOptions.some(option => option.value === quality) ? quality : profile.defaultQuality
      return {
        profile,
        ratio: targetRatio,
        quality: targetQuality,
        adjusted: targetRatio !== ratio || targetQuality !== quality,
      }
    })
}

/** Start with two models, not every configured API, to avoid surprise spend. */
export function initialComparisonProviders(
  profiles: readonly StudioProviderProfile[],
  activeProvider: StudioProvider,
): StudioProvider[] {
  const configured = profiles.filter(profile => profile.configured)
  const active = configured.find(profile => profile.provider === activeProvider)
  const ordered = active === undefined
    ? configured
    : [active, ...configured.filter(profile => profile.provider !== activeProvider)]
  return ordered.slice(0, 2).map(profile => profile.provider)
}

const RATIO_SORT_ORDER = ['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '4:5', '5:4', '16:9', '9:16', '21:9']
const QUALITY_SORT_ORDER = ['auto', 'standard', '1k', '1K', '2k', '2K', '3K', '4K', 'low', 'medium', 'high', 'xhigh', 'max', 'hd']

/** Union of every configured profile's options, for the shared comparison pickers. */
export function comparisonOptionUnion(
  profiles: readonly StudioProviderProfile[],
  key: 'ratioOptions' | 'qualityOptions',
): StudioOption[] {
  const sortOrder = key === 'ratioOptions' ? RATIO_SORT_ORDER : QUALITY_SORT_ORDER
  const seen = new Map<string, StudioOption>()
  for (const profile of profiles) {
    if (!profile.configured) continue
    for (const option of profile[key]) if (!seen.has(option.value)) seen.set(option.value, option)
  }
  const rank = (value: string): number => {
    const index = sortOrder.indexOf(value)
    return index === -1 ? sortOrder.length : index
  }
  return [...seen.values()].sort((a, b) => rank(a.value) - rank(b.value))
}