import './tl/css-supports-shim.js';
import type { Context } from '@deepseek-ai/cordis';
export interface SettingsScopeSnapshot<T> {
    value: T | undefined;
    writable: boolean;
}
export interface SettingsScope<T> {
    getSnapshot(): SettingsScopeSnapshot<T>;
    subscribe(listener: () => void): () => void;
    /** New hosts return true/false; legacy settings scopes resolve to void. */
    set(field: string, value: unknown): Promise<boolean | void>;
}
import type { InjectFace, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type ComfyUIWorkflowEntry, type ImageProvider } from '../shared.js';
import { type LocaleService } from './gallery-view.js';
import { type ImageResultPresentation } from './image-result-node.js';
type Provider = ImageProvider;
interface ImageSettings {
    provider?: Provider;
    googleModel?: string;
    googleEndpoint?: string;
    openaiBaseURL?: string;
    openaiModel?: string;
    openaiCompatBaseURL?: string;
    openaiCompatModel?: string;
    /** Edit-request shape for the openai-compat relay (#41); see src/config.ts. */
    openaiCompatEditFormat?: 'multipart' | 'jsonImageUrlArray' | 'formReferenceImages';
    /** Extra JSON fields merged into the JSON edit body; ignored in multipart mode. */
    openaiCompatEditExtra?: Record<string, unknown>;
    seedreamBaseURL?: string;
    seedreamModel?: string;
    /** Ark `output_format`; `png` is lossless and keeps an alpha channel. */
    seedreamOutputFormat?: 'png' | 'jpeg';
    /** Ark `watermark`; off removes the baked-in "AI generated" mark. */
    seedreamWatermark?: boolean;
    /** Ark `background`; `transparent` needs an alpha-bearing edit reference. */
    seedreamBackground?: 'opaque' | 'transparent';
    dashscopeEndpoint?: string;
    dashscopeModel?: string;
    xaiBaseURL?: string;
    xaiModel?: string;
    zhipuBaseURL?: string;
    zhipuModel?: string;
    comfyuiBaseURL?: string;
    comfyuiWorkflows?: ComfyUIWorkflowEntry[];
    comfyuiActiveWorkflow?: string;
    comfyuiWorkflowJson?: string;
    comfyuiWorkflowName?: string;
    comfyuiTimeoutMs?: number;
    saveToWorkspace?: boolean;
    workspaceFolder?: string;
    showProviderPill?: boolean;
}
interface CredentialInfo {
    configured?: boolean;
    source?: string;
    writable?: boolean;
}
interface CredentialResult {
    ok: boolean;
    value?: Readonly<Record<string, CredentialInfo>>;
}
interface CredentialMutationResult {
    ok: boolean;
    error?: {
        message?: string;
    };
}
interface CredentialsRemote {
    describe(refs: string[]): Promise<CredentialResult>;
    set(ref: string, value: string): Promise<CredentialMutationResult>;
    /** Present only on modern hosts; feature-detected before use; undefined while degraded. */
    unset?: ((ref: string) => Promise<CredentialMutationResult>) | undefined;
}
/** Notifies the settings card whenever any credential reference changes on the host. */
interface CredentialEvents {
    listen(callback: () => void): () => void;
}
interface SettingsFace {
    scope: SettingsScope<ImageSettings>;
    credentials: CredentialsRemote;
    /** False while the host core exposes no credentials service; the key UI degrades but the card stays mounted. */
    credentialsAvailable: () => boolean;
    locale?: LocaleService | undefined;
    credentialEvents?: CredentialEvents | undefined;
}
interface ImageCardFace {
    locale?: LocaleService | undefined;
    promoted: boolean;
}
type SettingsCardProps = PropsRuntime<'settings.plugins.tab'> & InjectFace<SettingsFace>;
type ImageCardProps = PropsRuntime<'tool.call.toolview'> & InjectFace<ImageCardFace>;
interface ImageResultNodeProps {
    node: {
        data: {
            results: readonly ImageResultPresentation[];
        };
    };
    locale?: LocaleService | undefined;
}
/**
 * Required browser services. The settings form reader is deliberately absent:
 * DSH 0.1.7 serves it as `configForms` (keyed by the Loader entry id) while
 * 0.1.5/0.1.6 expose `settingsScope` (keyed by the legacy namespace), so it is
 * probed at runtime in `apply`. A static inject of either name would park this
 * fiber forever on hosts from the other generation — the issue #55 failure.
 */
export declare const inject: string[];
/** Mount the settings card, generated-image card, and native conversation gallery view. */
export declare function apply(ctx: Context): void;
/** Edit each provider independently, pick an explicit default, and verify keys inline. */
export declare function ImageGenerationSettingsCard(props: SettingsCardProps): import("react").JSX.Element;
/** Keep the legacy Tool row for old DSH and hand modern results to the independent Chat node. */
export declare function GeneratedImageCard(props: ImageCardProps): import("react").JSX.Element;
/** Suppress the folded duplicate on modern hosts; render every image on legacy hosts. */
export declare function GeneratedImagesCard(props: ImageCardProps): import("react").JSX.Element;
/** Render modern image artifacts as final conversation output instead of Tool process content. */
export declare function PromotedImageResultNode(props: ImageResultNodeProps): import("react").JSX.Element;
export {};
