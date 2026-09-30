import { type StudioGenerateRequest } from '../shared.js';
export interface RegeneratableImage {
    provider: string;
    model: string;
    output?: string | undefined;
}
/** Build the workbench request that reproduces a conversation image with an edited prompt. */
export declare function conversationRegenerateRequest(image: RegeneratableImage, prompt: string, remembered?: {
    ratio: string;
    quality: string;
} | undefined): StudioGenerateRequest;
