import type { StudioOption, StudioProvider, StudioProviderProfile } from '../shared.js';
export interface ComparisonTarget {
    profile: StudioProviderProfile;
    ratio: string;
    quality: string;
    adjusted: boolean;
}
/** Map one shared output intent to settings accepted by every target model. */
export declare function buildComparisonTargets(profiles: readonly StudioProviderProfile[], selectedProviders: readonly StudioProvider[], ratio: string, quality: string): ComparisonTarget[];
/** Start with two models, not every configured API, to avoid surprise spend. */
export declare function initialComparisonProviders(profiles: readonly StudioProviderProfile[], activeProvider: StudioProvider): StudioProvider[];
/** Union of every configured profile's options, for the shared comparison pickers. */
export declare function comparisonOptionUnion(profiles: readonly StudioProviderProfile[], key: 'ratioOptions' | 'qualityOptions'): StudioOption[];
