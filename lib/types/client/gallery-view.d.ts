/**
 * Native Workspace Gallery & Studio View Component for DSH `conversation.view` slot.
 * Fully i18n-reactive (Chinese & English) with modular tabs, multi-dimensional filters,
 * responsive image grid, and placeholder routes.
 */
import { type FC } from 'react';
/** Host-provided locale service; `active` may be missing before the locale loads. */
export interface LocaleService {
    getSnapshot(): {
        active?: string;
    };
    subscribe(fn: () => void): () => void;
}
export type TabKey = 'gallery' | 'studio' | 'inspiration' | 'favorites';
export type SortKey = 'newest' | 'oldest';
declare const DICT: {
    readonly zh: {
        readonly tabGallery: "图库";
        readonly tabStudio: "工作台";
        readonly tabInspiration: "灵感";
        readonly tabFavorites: "收藏";
        readonly tabCompare: "对比";
        readonly tabTasks: "任务";
        readonly filterAllProviders: "全部提供商";
        readonly filterGoogle: "Google Gemini";
        readonly filterOpenAI: "OpenAI";
        readonly filterOpenAICompat: "OpenAI 兼容";
        readonly filterSeedream: "字节 Seedream";
        readonly filterDashScope: "阿里 DashScope";
        readonly filterXAI: "xAI Grok";
        readonly filterZhipu: "智谱 GLM";
        readonly filterComfyUI: "本地 ComfyUI";
        readonly filterImport: "导入";
        readonly importImages: "导入图片";
        readonly importAdded: "已导入 {count} 张图片";
        readonly importPartial: "导入 {count} 张，{fail} 张失败";
        readonly importFailed: "导入失败";
        readonly importPickHint: "选择要导入的图片（PNG/JPG/WebP/GIF）";
        readonly filterAllModels: "全部模型";
        readonly filterAllRatios: "全部比例";
        readonly searchPlaceholder: "搜索 Prompt、标签…";
        readonly filterCurrentWorkspace: "仅看此工作区";
        readonly filterCurrentWorkspaceHint: "只展示属于当前工作区的生图记录与物理文件";
        readonly sortNewest: "最新生成";
        readonly sortOldest: "最早生成";
        readonly totalCount: "共 {count} 张生成图片";
        readonly emptyTitle: "暂无生图记录";
        readonly emptyDesc: "在对话中让 Agent 生图后，生成的图片会自动收录到这里。";
        readonly favEmptyTitle: "暂无收藏图片";
        readonly favEmptyDesc: "在图库中点击卡片右下角的 ♡ 按钮，即可将喜爱的图片收录到这里。";
        readonly noMatchTitle: "未找到匹配结果";
        readonly noMatchDesc: "尝试更换搜索关键词或调整筛选条件。";
        readonly copiedPrompt: "已复制 Prompt";
        readonly copiedImage: "已复制图片";
        readonly copyFailed: "复制失败";
        readonly favoriteAdded: "已添加到收藏";
        readonly favoriteRemoved: "已取消收藏";
        readonly preview: "查看大图";
        readonly download: "下载图片";
        readonly copyImg: "复制图片";
        readonly copyPpt: "复制 Prompt";
        readonly regenerate: "重新生成";
        readonly regenerateTitle: "重新生成图片";
        readonly regenerateHint: "可按需修改 Prompt，基于当前模型和比例在画廊生成一张新图片。";
        readonly confirmRegenerate: "开始生成";
        readonly regenerating: "正在重新生成…";
        readonly regenerateSuccess: "已生成新图片并收录到画廊";
        readonly regenerateSaveFailed: "图片已生成，但保存到图库失败，请重试";
        readonly regenerateFailed: "重新生成失败";
        readonly delete: "从画廊删除";
        readonly confirmDelete: "确定要从画廊中删除这张图片吗？（不会影响原聊天记录）";
        readonly deleted: "已从画廊删除";
        readonly model: "模型";
        readonly prompt: "Prompt";
        readonly close: "关闭 (Esc)";
        readonly prevImage: "上一张 (←)";
        readonly nextImage: "下一张 (→)";
        readonly manage: "批量管理";
        readonly exitManage: "退出选择";
        readonly selectedCount: "已选 {n} 项";
        readonly selectAll: "全选";
        readonly invertSelect: "反选";
        readonly clearSelect: "清空";
        readonly batchFavorite: "批量收藏";
        readonly batchUnfavorite: "批量取消收藏";
        readonly batchFavoritedToast: "已将 {count} 张图片加入收藏";
        readonly batchUnfavoritedToast: "已取消 {count} 张图片的收藏";
        readonly batchFavoriteFailed: "收藏操作失败，请重试";
        readonly batchDownload: "批量下载";
        readonly batchDownloading: "打包中 ({current}/{total})…";
        readonly batchDownloadSingleToast: "已下载 1 张图片";
        readonly batchDownloadZipToast: "已打包下载 {count} 张图片";
        readonly batchDownloadFailed: "批量下载失败，请重试";
        readonly batchDelete: "批量删除";
        readonly batchDeleteTitle: "确认批量删除选中的 {count} 张图片？";
        readonly batchDeleteTitleSingle: "确认从画廊中删除这张图片？";
        readonly batchDeleteDesc: "将从画廊历史记录中移除所选图片。";
        readonly deleteWorkspaceFilesOpt: "同时清理工作区磁盘物理文件（不可恢复）";
        readonly cancel: "取消";
        readonly confirmBatchDelete: "确认删除 ({count})";
        readonly confirmDeleteSingle: "确认删除";
        readonly batchDeletedToast: "已删除 {count} 张图片";
        readonly batchDeletedWithFilesToast: "已删除 {count} 张图片，并清理了 {files} 个工作区文件";
        readonly deleteFailedFileLocked: "已删除 {count} 张图片，但有 {files} 个文件因被系统占用未能删除";
        readonly deleteFailedDatabase: "删除失败：本地数据库操作异常";
        readonly justNow: "刚刚";
        readonly minutesAgo: "{n} 分钟前";
        readonly hoursAgo: "{n} 小时前";
        readonly daysAgo: "{n} 天前";
        readonly studioTitle: "AI 图像工作台 (Studio)";
        readonly studioDesc: "工作台模块正在紧锣密鼓开发中。在此你将体验大图精修、变体生成 (Variations)、参数重调并一键将生成结果无缝插回 DSH 正在进行的对话。";
        readonly studioTip: "💡 提示：目前你可以在“图库”中点击任意图片，在弹窗中进行查看、复制与下载。";
        readonly compareTitle: "多模型横向对比 (Compare)";
        readonly compareDesc: "支持单个 Prompt 一键同时调度 Gemini、Seedream、DashScope 及本地 ComfyUI 模型并排生成，直观横评画质与细节。";
        readonly tasksTitle: "异步任务队列 (Tasks)";
        readonly tasksDesc: "集中管理后台批量生图、多模型并发生成与本地 ComfyUI 耗时任务。支持状态追踪、失败重试与执行耗时分析。";
        readonly comingSoonBadge: "即将推出";
    };
    readonly en: {
        readonly tabGallery: "Gallery";
        readonly tabStudio: "Studio";
        readonly tabInspiration: "Inspiration";
        readonly tabFavorites: "Favorites";
        readonly tabCompare: "Compare";
        readonly tabTasks: "Tasks";
        readonly filterAllProviders: "All Providers";
        readonly filterGoogle: "Google Gemini";
        readonly filterOpenAI: "OpenAI";
        readonly filterOpenAICompat: "OpenAI-compatible";
        readonly filterSeedream: "ByteDance Seedream";
        readonly filterDashScope: "Aliyun DashScope";
        readonly filterXAI: "xAI Grok";
        readonly filterZhipu: "Zhipu GLM";
        readonly filterComfyUI: "Local ComfyUI";
        readonly filterImport: "Imported";
        readonly importImages: "Import images";
        readonly importAdded: "Imported {count} images";
        readonly importPartial: "Imported {count}, {fail} failed";
        readonly importFailed: "Import failed";
        readonly importPickHint: "Choose images to import (PNG/JPG/WebP/GIF)";
        readonly filterAllModels: "All Models";
        readonly filterAllRatios: "All Ratios";
        readonly searchPlaceholder: "Search prompt, tags…";
        readonly filterCurrentWorkspace: "Current workspace only";
        readonly filterCurrentWorkspaceHint: "Only show images belonging to the active workspace";
        readonly sortNewest: "Newest first";
        readonly sortOldest: "Oldest first";
        readonly totalCount: "{count} images total";
        readonly emptyTitle: "No images generated yet";
        readonly emptyDesc: "Images generated during conversations will automatically appear here.";
        readonly favEmptyTitle: "No favorite images yet";
        readonly favEmptyDesc: "Click the ♡ button on any card in the gallery to collect your favorite images here.";
        readonly noMatchTitle: "No matching images";
        readonly noMatchDesc: "Try a different search keyword or adjust filter criteria.";
        readonly copiedPrompt: "Prompt copied";
        readonly copiedImage: "Image copied";
        readonly copyFailed: "Copy failed";
        readonly favoriteAdded: "Added to favorites";
        readonly favoriteRemoved: "Removed from favorites";
        readonly preview: "Full Preview";
        readonly download: "Download";
        readonly copyImg: "Copy Image";
        readonly copyPpt: "Copy Prompt";
        readonly regenerate: "Regenerate";
        readonly regenerateTitle: "Regenerate Image";
        readonly regenerateHint: "Edit prompt if needed. A new image will be generated and added to the gallery.";
        readonly confirmRegenerate: "Generate";
        readonly regenerating: "Regenerating…";
        readonly regenerateSuccess: "New image generated and added to gallery";
        readonly regenerateSaveFailed: "Image generated, but saving to the gallery failed. Please retry.";
        readonly regenerateFailed: "Regeneration failed";
        readonly delete: "Delete from gallery";
        readonly confirmDelete: "Are you sure you want to remove this image from the gallery? (Chat history will not be affected)";
        readonly deleted: "Deleted from gallery";
        readonly model: "Model";
        readonly prompt: "Prompt";
        readonly close: "Close (Esc)";
        readonly prevImage: "Previous (←)";
        readonly nextImage: "Next (→)";
        readonly manage: "Batch Manage";
        readonly exitManage: "Done";
        readonly selectedCount: "{n} selected";
        readonly selectAll: "Select All";
        readonly invertSelect: "Invert";
        readonly clearSelect: "Clear";
        readonly batchFavorite: "Batch Favorite";
        readonly batchUnfavorite: "Batch Unfavorite";
        readonly batchFavoritedToast: "Added {count} images to favorites";
        readonly batchUnfavoritedToast: "Removed {count} images from favorites";
        readonly batchFavoriteFailed: "Favorite operation failed, please retry";
        readonly batchDownload: "Batch Download";
        readonly batchDownloading: "Packaging ({current}/{total})…";
        readonly batchDownloadSingleToast: "Downloaded 1 image";
        readonly batchDownloadZipToast: "Packaged & downloaded {count} images";
        readonly batchDownloadFailed: "Batch download failed, please retry";
        readonly batchDelete: "Batch Delete";
        readonly batchDeleteTitle: "Delete {count} selected images?";
        readonly batchDeleteTitleSingle: "Delete this image from gallery?";
        readonly batchDeleteDesc: "These images will be removed from your gallery history.";
        readonly deleteWorkspaceFilesOpt: "Also delete files from workspace disk (cannot be undone)";
        readonly cancel: "Cancel";
        readonly confirmBatchDelete: "Delete ({count})";
        readonly confirmDeleteSingle: "Delete";
        readonly batchDeletedToast: "Deleted {count} images";
        readonly batchDeletedWithFilesToast: "Deleted {count} images and cleaned {files} workspace files";
        readonly deleteFailedFileLocked: "Deleted {count} images, but {files} files could not be deleted (busy/locked)";
        readonly deleteFailedDatabase: "Failed to delete: local database error";
        readonly justNow: "Just now";
        readonly minutesAgo: "{n}m ago";
        readonly hoursAgo: "{n}h ago";
        readonly daysAgo: "{n}d ago";
        readonly studioTitle: "AI Image Studio";
        readonly studioDesc: "Studio workbench is under active development. Fine-tune prompts, generate variations (2x/4x), and inject images directly into DSH chat.";
        readonly studioTip: "💡 Tip: You can currently click any image in the Gallery to preview, copy, or download it.";
        readonly compareTitle: "Model Comparison (Compare)";
        readonly compareDesc: "Side-by-side multi-model benchmarking coming soon. Test Gemini, Seedream, DashScope, and ComfyUI with a single prompt.";
        readonly tasksTitle: "Task Queue (Tasks)";
        readonly tasksDesc: "Centralized view for batch generation, asynchronous ComfyUI runs, live progress tracking, and retry controls.";
        readonly comingSoonBadge: "Coming Soon";
    };
};
export type DictKey = keyof typeof DICT.zh;
export interface GalleryViewTabProps {
    locale?: LocaleService | undefined;
    sessionId?: string;
    useSession?: (selector: (state: any) => any) => any;
    useSessions?: (selector: (state: any) => any) => any;
    useWorkspaces?: (selector: (state: any) => any) => any;
    /** Host credential-change notifier; forwarded to the studio workbench. */
    credentialEvents?: {
        listen(callback: () => void): () => void;
    } | undefined;
    /**
     * Right-sidebar variant (DSH official `sidebar.right.pane.tab` seat). The
     * native conversation stays in the main area, so the composer must NOT be
     * hidden and the page-level CSS must not scope to the conversation column.
     */
    inSidebar?: boolean;
    /** Sub-tab opened first; the sidebar variant starts on the studio workbench. */
    defaultTab?: TabKey;
    /** Canvas surface the studio opens with; the sidebar variant shows the tldraw infinite canvas directly. */
    initialCanvasSurface?: 'preview' | 'infinite';
    /**
     * Sidebar tab visibility reader injected by DSH's `sidebar.right.pane.tab`
     * seat (absent on hosts that mount this view elsewhere, e.g. the main-area
     * conversation tab, where the hook is optional).
     */
    useTabInfo?: (() => {
        tab?: {
            visible?: boolean;
        };
    }) | undefined;
}
export declare const GalleryViewTab: FC<GalleryViewTabProps>;
export { copyImageBlob } from './browser-image-utils.js';
