interface EventEntry {
    readonly type: string;
    readonly event: {
        readonly type: string;
        readonly seq: number;
        readonly data: Record<string, unknown>;
    };
}
interface EventSource {
    getSnapshot(): {
        readonly entries: readonly EventEntry[];
        readonly change: {
            readonly kind: string;
            readonly entries?: readonly EventEntry[];
        };
    };
    subscribe(listener: () => void): () => void;
}
/** Small runtime face: older hosts may not expose the modern session feed. */
export interface CanvasSessions {
    list: {
        getSnapshot(): {
            current?: string | undefined;
        };
        subscribe(listener: () => void): () => void;
    };
    binding(id: string): {
        eventSource: EventSource;
    } | undefined;
}
/** Subscribe to live additions, never to card rendering or history replay. */
export declare function startConversationLandings(sessions: CanvasSessions): () => void;
export {};
