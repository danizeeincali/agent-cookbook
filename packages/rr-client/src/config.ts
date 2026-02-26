/**
 * Configuration management for Agent Cookbook
 * Default: opt-out (all features enabled by default)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Agent keys (Ed25519)
 */
export interface AgentKeys {
  public_key: string;
  private_key: string;
}

/**
 * Auto-receipt submission settings
 */
export interface AutoReceiptConfig {
  enabled: boolean; // Default: true (opt-out)
  min_grade: number; // Only submit if grade >= this value
  require_tests: boolean; // Only submit if tests pass
  silent: boolean; // No notifications on success
}

/**
 * Auto-recipe creation settings
 */
export interface AutoRecipeConfig {
  enabled: boolean; // Default: true (opt-out)
  min_steps: number; // Minimum workflow steps to detect
  require_tests: boolean; // Recipe must have tests
  confirm: boolean; // Ask before submitting (default: yes)
}

/**
 * Registry settings
 */
export interface RegistryConfig {
  url: string;
  cache_ttl: number; // Cache TTL in seconds
  sync_interval: number; // Sync interval in seconds
}

/**
 * Privacy settings
 */
export interface PrivacyConfig {
  anonymous: boolean; // Don't include any PII
  public_key_only: boolean; // Only identify by public key
  opt_out_url: string;
}

/**
 * Complete configuration
 */
export interface CookbookConfig {
  version: string;
  agent?: AgentKeys; // Optional, generated on first use
  auto_receipts: AutoReceiptConfig;
  auto_recipes: AutoRecipeConfig;
  registry: RegistryConfig;
  privacy: PrivacyConfig;
}

/**
 * Default configuration (opt-out)
 */
export const DEFAULT_CONFIG: Omit<CookbookConfig, 'agent'> = {
  version: '1.0.0',
  auto_receipts: {
    enabled: true, // OPT-OUT
    min_grade: 0.8,
    require_tests: true,
    silent: true,
  },
  auto_recipes: {
    enabled: true, // OPT-OUT
    min_steps: 3,
    require_tests: true,
    confirm: true,
  },
  registry: {
    url: 'https://cookbook.daniz.dev',
    cache_ttl: 3600, // 1 hour
    sync_interval: 86400, // 1 day
  },
  privacy: {
    anonymous: true,
    public_key_only: true,
    opt_out_url: 'https://cookbook.daniz.dev/opt-out',
  },
};

/**
 * Get default config path
 */
export function getConfigPath(customPath?: string): string {
  if (customPath) {
    return customPath;
  }
  return join(homedir(), '.agent-cookbook', 'config.json');
}

/**
 * Validate and clamp config values
 */
function validateConfig(config: CookbookConfig): CookbookConfig {
  // Clamp min_grade to [0.0, 1.0]
  config.auto_receipts.min_grade = Math.max(
    0.0,
    Math.min(1.0, config.auto_receipts.min_grade)
  );

  // Clamp min_steps to minimum 1
  config.auto_recipes.min_steps = Math.max(1, config.auto_recipes.min_steps);

  return config;
}

/**
 * Merge loaded config with defaults
 */
function mergeWithDefaults(
  loaded: Partial<CookbookConfig>
): CookbookConfig {
  return {
    version: loaded.version || DEFAULT_CONFIG.version,
    agent: loaded.agent,
    auto_receipts: {
      ...DEFAULT_CONFIG.auto_receipts,
      ...loaded.auto_receipts,
    },
    auto_recipes: {
      ...DEFAULT_CONFIG.auto_recipes,
      ...loaded.auto_recipes,
    },
    registry: {
      ...DEFAULT_CONFIG.registry,
      ...loaded.registry,
    },
    privacy: {
      ...DEFAULT_CONFIG.privacy,
      ...loaded.privacy,
    },
  };
}

/**
 * Load config from disk
 * If config doesn't exist, creates it with defaults
 * If config is corrupted, overwrites with defaults
 */
export async function loadConfig(
  configPath?: string
): Promise<CookbookConfig> {
  const path = getConfigPath(configPath);

  try {
    // Try to read existing config
    const content = await readFile(path, 'utf-8');
    const loaded = JSON.parse(content) as Partial<CookbookConfig>;

    // Merge with defaults and validate
    const config = validateConfig(mergeWithDefaults(loaded));

    return config;
  } catch (err) {
    // Config doesn't exist or is corrupted
    // Create default config (deep copy to avoid mutating DEFAULT_CONFIG)
    const config: CookbookConfig = {
      version: DEFAULT_CONFIG.version,
      agent: undefined,
      auto_receipts: { ...DEFAULT_CONFIG.auto_receipts },
      auto_recipes: { ...DEFAULT_CONFIG.auto_recipes },
      registry: { ...DEFAULT_CONFIG.registry },
      privacy: { ...DEFAULT_CONFIG.privacy },
    };

    // Ensure directory exists
    await mkdir(dirname(path), { recursive: true });

    // Write default config
    await writeFile(path, JSON.stringify(config, null, 2), 'utf-8');

    return config;
  }
}

/**
 * Save config to disk
 */
export async function saveConfig(
  config: CookbookConfig,
  configPath?: string
): Promise<void> {
  const path = getConfigPath(configPath);

  // Validate before saving
  const validated = validateConfig(config);

  // Ensure directory exists
  await mkdir(dirname(path), { recursive: true });

  // Write config
  await writeFile(path, JSON.stringify(validated, null, 2), 'utf-8');
}

/**
 * Reset config to defaults
 * Preserves agent keys if they exist
 */
export async function resetConfig(
  configPath?: string
): Promise<CookbookConfig> {
  const path = getConfigPath(configPath);

  // Try to read existing config to preserve agent keys
  let existingKeys: AgentKeys | undefined;
  try {
    const content = await readFile(path, 'utf-8');
    const existing = JSON.parse(content) as Partial<CookbookConfig>;
    existingKeys = existing.agent;
  } catch {
    // No existing config or corrupted
  }

  // Create default config with preserved keys (deep copy to avoid mutation)
  const config: CookbookConfig = {
    version: DEFAULT_CONFIG.version,
    agent: existingKeys,
    auto_receipts: { ...DEFAULT_CONFIG.auto_receipts },
    auto_recipes: { ...DEFAULT_CONFIG.auto_recipes },
    registry: { ...DEFAULT_CONFIG.registry },
    privacy: { ...DEFAULT_CONFIG.privacy },
  };

  // Save to disk
  await saveConfig(config, path);

  return config;
}

/**
 * Update specific config fields
 */
export async function updateConfig(
  updates: Partial<CookbookConfig>,
  configPath?: string
): Promise<CookbookConfig> {
  const config = await loadConfig(configPath);

  // Apply updates
  const updated: CookbookConfig = {
    ...config,
    ...updates,
    auto_receipts: {
      ...config.auto_receipts,
      ...updates.auto_receipts,
    },
    auto_recipes: {
      ...config.auto_recipes,
      ...updates.auto_recipes,
    },
    registry: {
      ...config.registry,
      ...updates.registry,
    },
    privacy: {
      ...config.privacy,
      ...updates.privacy,
    },
  };

  // Save updated config
  await saveConfig(updated, configPath);

  return updated;
}
