/**
 * CLI config commands
 * Provides user-friendly interface for managing configuration
 */

import { loadConfig, updateConfig, resetConfig } from './config.js';
import type { CookbookConfig } from './config.js';

/**
 * Format config for display
 */
function formatConfig(config: CookbookConfig): string {
  const lines: string[] = [];

  lines.push('Agent Cookbook Configuration');
  lines.push('===========================\n');

  // Agent info
  if (config.agent?.public_key) {
    lines.push('Agent Identity:');
    lines.push(`  Public key: ${config.agent.public_key.slice(0, 16)}...`);
    lines.push('');
  }

  // Auto-receipts
  lines.push('Auto-receipts:');
  lines.push(`  Enabled: ${config.auto_receipts.enabled ? '✓' : '✗'}`);
  lines.push(`  Min grade: ${config.auto_receipts.min_grade}`);
  lines.push(`  Require tests: ${config.auto_receipts.require_tests ? 'yes' : 'no'}`);
  lines.push(`  Silent: ${config.auto_receipts.silent ? 'yes' : 'no'}`);
  lines.push('');

  // Auto-recipes
  lines.push('Auto-recipes:');
  lines.push(`  Enabled: ${config.auto_recipes.enabled ? '✓' : '✗'}`);
  lines.push(`  Min steps: ${config.auto_recipes.min_steps}`);
  lines.push(`  Require tests: ${config.auto_recipes.require_tests ? 'yes' : 'no'}`);
  lines.push(`  Confirm: ${config.auto_recipes.confirm ? 'yes' : 'no'}`);
  lines.push('');

  // Registry
  lines.push('Registry:');
  lines.push(`  URL: ${config.registry.url}`);
  lines.push(`  Cache TTL: ${config.registry.cache_ttl}s`);
  lines.push(`  Sync interval: ${config.registry.sync_interval}s`);
  lines.push('');

  // Privacy
  lines.push('Privacy:');
  lines.push(`  Anonymous: ${config.privacy.anonymous ? 'yes' : 'no'}`);
  lines.push(`  Public key only: ${config.privacy.public_key_only ? 'yes' : 'no'}`);
  lines.push(`  Opt-out URL: ${config.privacy.opt_out_url}`);

  return lines.join('\n');
}

/**
 * Show current config
 */
export async function showConfig(configPath?: string): Promise<string> {
  const config = await loadConfig(configPath);
  return formatConfig(config);
}

/**
 * Disable auto-receipts
 */
export async function disableAutoReceipts(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  await updateConfig(
    {
      auto_receipts: {
        ...config.auto_receipts,
        enabled: false,
      },
    },
    configPath
  );
}

/**
 * Enable auto-receipts
 */
export async function enableAutoReceipts(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  await updateConfig(
    {
      auto_receipts: {
        ...config.auto_receipts,
        enabled: true,
      },
    },
    configPath
  );
}

/**
 * Disable auto-recipes
 */
export async function disableAutoRecipes(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  await updateConfig(
    {
      auto_recipes: {
        ...config.auto_recipes,
        enabled: false,
      },
    },
    configPath
  );
}

/**
 * Enable auto-recipes
 */
export async function enableAutoRecipes(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  await updateConfig(
    {
      auto_recipes: {
        ...config.auto_recipes,
        enabled: true,
      },
    },
    configPath
  );
}

/**
 * Disable all auto features
 */
export async function disableAllAuto(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);

  await updateConfig(
    {
      auto_receipts: {
        ...config.auto_receipts,
        enabled: false,
      },
      auto_recipes: {
        ...config.auto_recipes,
        enabled: false,
      },
    },
    configPath
  );
}

/**
 * Enable all auto features
 */
export async function enableAllAuto(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);

  await updateConfig(
    {
      auto_receipts: {
        ...config.auto_receipts,
        enabled: true,
      },
      auto_recipes: {
        ...config.auto_recipes,
        enabled: true,
      },
    },
    configPath
  );
}

/**
 * Reset config to defaults
 */
export async function resetConfigCommand(configPath?: string): Promise<void> {
  await resetConfig(configPath);
}
