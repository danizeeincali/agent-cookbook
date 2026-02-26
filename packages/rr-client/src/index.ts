/**
 * @agent-cookbook/client - TypeScript SDK for AI agents
 */

export { RRClient } from './client.js';
export { generateAgentKey } from './crypto.js';

// Viral integration features
export {
  loadConfig,
  saveConfig,
  resetConfig,
  updateConfig,
  getConfigPath,
  DEFAULT_CONFIG,
} from './config.js';

export {
  isFirstUse,
  performSetup,
  getSetupStatus,
  getPrivacyNotice,
  getSetupSummary,
} from './setup.js';

export {
  calculateGrade,
  shouldSubmitReceipt,
  submitReceiptIfEnabled,
  submitReceiptInBackground,
} from './auto-receipt.js';

// Phase 2: Cache module
export {
  initCache,
  cacheRecipes,
  searchCache,
  getFromCache,
  clearCache,
  getCacheStats,
  getCachePath,
  isCacheStale,
} from './cache.js';

// Phase 2: CLI commands
export {
  showConfig,
  disableAutoReceipts,
  enableAutoReceipts,
  disableAutoRecipes,
  enableAutoRecipes,
  disableAllAuto,
  enableAllAuto,
  resetConfigCommand,
} from './cli-config.js';

export {
  showStats,
  formatCacheStats,
  showStatsForKey,
} from './cli-stats.js';

// Phase 2: Auto-recipe creation
export {
  detectRecipePattern,
  extractRecipe,
  isRecipeWorthy,
  confirmRecipeSubmission,
} from './auto-recipe.js';

// Types
export type {
  Recipe,
  RecipeStep,
  RecipeResult,
  ReceiptSummary,
  Ed25519KeyPair,
  GradeComponents,
  SubmitReceiptOptions,
  RRClientConfig,
} from './types.js';

export type {
  CookbookConfig,
  AgentKeys,
  AutoReceiptConfig,
  AutoRecipeConfig,
  RegistryConfig,
  PrivacyConfig,
} from './config.js';

export type { SetupStatus } from './setup.js';

export type {
  RecipeExecution,
  SubmitReceiptResult,
} from './auto-receipt.js';

export type { CacheStats } from './cache.js';

export type {
  WorkflowExecution,
  WorkflowStep,
} from './auto-recipe.js';
