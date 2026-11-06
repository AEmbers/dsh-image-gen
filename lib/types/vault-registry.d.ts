import { type SavedOriginal, type VaultConfig } from './vault-store.js';
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment';
export interface VaultRegistryProfile {
    keys: string[];
    updatedAt: number;
}
export interface VaultRegistry {
    version: 1;
    profiles: Record<string, VaultRegistryProfile>;
}
export interface VaultRegistryLoad {
    status: 'ok' | 'missing' | 'corrupt';
    registry?: VaultRegistry;
}
export declare function isValidVaultProfileId(value: unknown): value is string;
export declare function loadVaultRegistry(dir: string): Promise<VaultRegistryLoad>;
/** Store and claim an import in the same transaction used by explicit deletion. */
export declare function saveImportedOriginal(config: VaultConfig, input: {
    data: Uint8Array;
    mediaType: ImageMediaType;
}, profileId?: string): Promise<SavedOriginal | undefined>;
/**
 * Merge one profile's complete key set into the persistent registry.
 *
 * On first creation, pre-existing vault files that the syncing profile does
 * not already reference are placed in a reserved legacy profile, so a browser
 * that has not opened yet cannot lose an original. Once a profile syncs a
 * legacy key, the unknown legacy owners remain protected too.
 */
export declare function updateVaultRegistry(dir: string, profileId: string, keys: readonly string[]): Promise<VaultRegistry | undefined>;
/** Remove explicitly owned keys using the same transaction as reference sync. */
export declare function deleteUnreferencedOriginals(config: VaultConfig, profileId: string, keys: readonly string[], deleteKeys: readonly string[]): Promise<{
    removed: number;
    bytes: number;
} | undefined>;
export declare function unionVaultKeys(registry: VaultRegistry): string[];
