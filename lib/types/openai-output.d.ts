/** Independent size and quality controls for official and compatible image APIs. */
import type { Config } from './config.js';
import type { StudioOption } from './shared.js';
export { compatGenerationExtraBody, compatWatermarkField, compatWatermarkOptions } from './watermark.js';
export declare const PROVIDER_DEFAULT_QUALITY = "__default__";
export declare const DEFAULT_COMPAT_QUALITIES: string[];
export declare function officialSizeTable(config: Config, model: string): Record<string, Record<string, string>>;
/** Check the official model contract before spending a request. Relays own their size contract. */
export declare function validateOfficialSize(model: string, size: string): void;
export declare function officialQualityOptions(model: string): StudioOption[];
export declare function compatQualityOptions(config: Config): StudioOption[];
export declare function compatRequestQuality(config: Config, selected?: string): string | undefined;
