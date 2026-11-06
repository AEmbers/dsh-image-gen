import type { GalleryItem } from './gallery-store.js';
/** Hover prefetch stops pulling raw originals above this size; drag-out then uses the attachment. */
export declare const GALLERY_PREFETCH_ORIGINAL_MAX_BYTES: number;
/** Stable per-browser-profile identity; the vault registry unions all profiles. */
export declare function vaultProfileId(): string | undefined;
/** Sync this profile's references; the server never deletes originals here. */
export declare function syncVaultRefs(keys: string[]): Promise<void>;
/** Manual gallery deletion: remove originals only after the server checks every profile. */
export declare function deleteVaultOriginals(deleteKeys: string[], remainingKeys: string[]): void;
export declare function vaultKeysOf(items: readonly GalleryItem[]): string[];
/** Full bytes for copy/download/drag: raw vault first, normalized attachment fallback. */
export declare function fetchGalleryItemBlob(item: GalleryItem): Promise<Blob>;
export interface GalleryStorageStats {
    attachments: {
        count: number;
        bytes: number;
    };
    requestImages: {
        count: number;
        bytes: number;
    };
    thumbs: {
        count: number;
        bytes: number;
    };
    orphans: {
        count: number;
        bytes: number;
        ids: string[];
    };
    scannedAt: number;
}
export declare function formatStorageBytes(bytes: number): string;
/** Desktop pickers can omit `File.type` for UNC/temp paths; fall back to the extension. */
export declare function imageMediaTypeOf(file: File): string | undefined;
/** Probe once whether this host can stream ZIP exports (older hosts 404 the route). */
export declare function canUseServerZip(): Promise<boolean>;
export declare function extensionFor(mediaType: string): string;
/** Download names must follow the resolved bytes, including vault fallbacks. */
export declare function galleryDownloadName(item: GalleryItem, blob: Blob): string;
/**
 * Ask the host to stream the archive through a hidden form post.
 * A real form navigation would replace the SPA, so the response lands in an
 * off-screen iframe and the browser download manager owns the transfer.
 */
export declare function postZipDownload(items: GalleryItem[], token: string): void;
