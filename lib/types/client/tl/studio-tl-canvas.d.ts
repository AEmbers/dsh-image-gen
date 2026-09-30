import { type FC } from 'react';
/** Reset canvas-owned data only. Gallery records and host attachments are untouched. */
export declare function clearStudioTlCanvases(): boolean;
/**
 * Cancel in-editor selection on every mounted canvas, keeping shapes and sync
 * untouched. Selection is interaction state tied to the surface: leaving the
 * studio page cancels it so a stale selection can neither resurface on return
 * nor linger in the host mirror.
 */
export declare function deselectStudioTlCanvases(): boolean;
export declare const StudioTlCanvas: FC<{
    lang?: 'zh' | 'en';
}>;
