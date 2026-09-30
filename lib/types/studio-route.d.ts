/** Same-origin HTTP bridge used by the browser image workbench. */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { type StudioConfigResponse, type StudioGenerateRequest, type StudioGenerateResponse } from './shared.js';
export interface StudioRouteDeps {
    describe(): Promise<StudioConfigResponse>;
    generate(input: StudioGenerateRequest, signal: AbortSignal): Promise<StudioGenerateResponse>;
    maxBodyBytes: number;
    /** Heartbeat cadence for the streaming generation response; tests shrink it. */
    heartbeatMs?: number;
}
/** Serve workbench capabilities and generation requests without exposing provider credentials. */
export declare function serveStudio(req: IncomingMessage, res: ServerResponse, deps: StudioRouteDeps): Promise<void>;
/** Strictly validate the small untrusted workbench wire contract. */
export declare function parseStudioGenerateRequest(value: unknown): StudioGenerateRequest;
