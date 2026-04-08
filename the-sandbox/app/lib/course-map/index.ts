// Barrel file — re-exports public API from course-map services

// ─── Shared Types ───────────────────────────────────────────
export type {
  BranchInfo,
  BranchSnapshot,
  BranchNodeData,
  BranchEdgeData,
  BranchDiffResult,
  MergeConflictItem,
  MergePreview,
  MergeHistoryEntry,
  MergeExecutionResult,
  CherryPickItem,
  EditLock,
  EditOperation,
  ConflictData,
  ConflictStrategy,
  RemoteEditNotification,
  PluginPermission,
  PluginConfigField,
  PluginManifest,
  PluginLifecycleHooks,
  PluginEntry,
} from './types'

export {
  getAriaAttributes,
  announceStateChange,
  manageFocusTrap,
  getGraphTraversalKeymap,
} from './accessibility-manager'
export type { KeyBinding } from './accessibility-manager'

export { CourseMapAIAssistant } from './ai-assistant-service'
export type {
  CommandType,
  ParsedCommand,
  CommandResult,
  MapAction,
  ConnectionSuggestion,
  LayoutRecommendation,
  ContextualHelp,
} from './ai-assistant-service'

export {
  getCourseMapRealtimeAnalytics,
  getEditTimeSeries,
  getActiveUserHeatmap,
  getEngagementSummary,
} from './analytics-service'
export type {
  RealtimeAnalytics,
  NodeHeatmapEntry,
  EngagementSummary,
  TimeSeriesPoint,
} from './analytics-service'

export {
  createAnnotation,
  getAnnotations,
  getAnnotationsByNode,
  addReply,
  getReplies,
  resolveAnnotation,
  reopenAnnotation,
  deleteAnnotation,
} from './annotation-service'
export type { Annotation, AnnotationReply, AnnotationFilter } from './annotation-service'

export { BackgroundSyncManager } from './background-sync'
export type { SyncEvent } from './background-sync'

export { BranchManager } from './branch-service'

export { CollabEngine } from './collab-engine'

export {
  exportToSCORM,
  exportToMarkdown,
  exportToImage,
  generateTimeLimitedShareLink,
  downloadBlob,
  downloadText,
  downloadScormPackage,
} from './export-service'
export type { ScormPackageData, ImageExportOptions, ShareableLinkResult } from './export-service'

export {
  exportToPDF,
  exportToSlides,
  exportToCSV,
  generateShareableLink,
  downloadCSV,
  downloadJSON,
} from './export-suite-service'
export type {
  GraphMap,
  PdfExportOptions,
  SlideExportOptions,
  CsvRow,
  PdfPage,
  SlideData,
  ShareableLinkData,
} from './export-suite-service'

export { MergeEngine } from './merge-engine'

export {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from './notification-service'
export type { NotificationType, CourseMapNotification } from './notification-service'

export { courseMapCache, CourseMapCache } from './offline-cache'
export type { CachedCourseMap, PendingEdit } from './offline-cache'

export {
  queueOfflineEdit,
  getQueuedEdits,
  getQueueLength,
  flushQueue,
  clearQueue,
} from './offline-queue'
export type { OfflineEdit } from './offline-queue'

export {
  trackRenderTime,
  trackApiLatency,
  getPerformanceReport,
  checkPerformanceBudget,
  initWebVitalsObserver,
  collectMetricsBatch,
} from './perf-monitor'
export type { PerfEntry, PerfBucket, PerformanceReport, BudgetViolation, PerformanceBudgets } from './perf-monitor'

export { PerformanceProfiler } from './perf-profiler'
export type { RenderProfile, Bottleneck, RenderBudgetStatus, WebVitalsSnapshot, ProfileReport } from './perf-profiler'

export { PerformanceService } from './performance-service'
export type {
  PerfNode,
  PerfEdge,
  PerfViewportRect,
  VirtualizedResult,
  BatchedEdges,
  FrameBudgetState,
  RenderMetrics,
} from './performance-service'

export { PluginAPI } from './plugin-api'
export type { PluginAPICallbacks } from './plugin-api'

export { PluginRegistry } from './plugin-registry'

export { PluginSandbox } from './plugin-sandbox'
export type {
  SandboxedAPI,
  PluginNodeData,
  PluginEdgeData,
  PluginMapMetadata,
  PluginEvent,
  PluginEventCallback,
} from './plugin-sandbox'

export { PresenceManager } from './presence-service'
export type { PresenceUser, PresenceUpdate } from './presence-service'

export {
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isPushEnabled,
  getPushTypes,
} from './push-notifications'
export type { CourseMapNotificationType } from './push-notifications'

export { RealtimeAnalyticsManager } from './realtime-analytics'
export type {
  LiveSessionData,
  NodeHeatmapEntry as RealtimeNodeHeatmapEntry,
  EngagementMetrics,
  RealtimeAnalyticsSnapshot,
} from './realtime-analytics'

export {
  getCompletionProjections,
  getProgressHeatmap,
  getPrerequisiteChainAnalysis,
  generatePrintableSummary,
} from './reporting-service'
export type {
  ProgressEntry,
  CompletionProjection,
  HeatmapCell,
  ChainAnalysis,
  PrintableSummary,
} from './reporting-service'

export { SAMPLE_PLUGINS, getAvailablePlugins, getAllSampleManifests, getSamplePlugin, CUSTOM_NODE_TYPES } from './sample-plugins'
export type { SamplePluginDef } from './sample-plugins'

export { SearchFilterService, searchFilterService } from './search-filter-service'
export type {
  SearchableNode,
  SearchableEdge,
  NodeProgressStatus,
  SearchResult,
  FilterCriteria,
  FilterPreset,
  ActiveFilters,
} from './search-filter-service'

export { CourseMapSharingService } from './sharing-service'
export type { SharePermission, ShareLink, SharedUser, MapExportData, ImportPreview } from './sharing-service'

export { SmartAutomationEngine } from './smart-automation-service'
export type {
  PrerequisiteSuggestion,
  ScheduleConflict,
  WorkloadEntry,
  WorkloadAnalysis,
  WorkloadImbalance,
  HealthIssue,
  FixSuggestion,
  FixAction,
  HealthReport,
} from './smart-automation-service'

export {
  detectMissingPrerequisites,
  suggestOptimalOrdering,
  identifyContentGaps,
  recommendRelatedResources,
  runFullAnalysis,
} from './smart-suggestions-engine'
export type {
  SuggestionCategory,
  SuggestionSeverity,
  Suggestion,
  AnalysisResult,
} from './smart-suggestions-engine'

export {
  getContextSummary,
  getNodeContext,
  askAssistant,
  suggestNodeImprovements,
  generateContentSummary,
  answerStructureQuestion,
} from './teaching-assistant-service'
export type { AssistantMessage, NodeContext } from './teaching-assistant-service'

export { VisualizationService } from './visualization-service'
export type {
  VisNode,
  VisEdge,
  CanvasSize,
  ViewportRect,
  MinimapViewport,
  ZoomFitResult,
  GroupBoundingBox,
  NodeGroup,
  GroupedNodeSet,
  NodeShape,
  EdgeRoutingMode,
} from './visualization-service'

export { WhiteboardEngine, getCursorColor } from './whiteboard-engine'
export type { DrawingTool, Point, DrawingStroke, StickyNoteData, RemoteCursor } from './whiteboard-engine'
