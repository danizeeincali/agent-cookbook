/**
 * CLI stats commands
 * Display statistics about agent performance and cache
 */

import { loadConfig } from './config.js';
import { getCacheStats } from './cache.js';
import type { CacheStats } from './cache.js';

/**
 * Format cache statistics for display
 */
export function formatCacheStats(stats: CacheStats): string {
  const lines: string[] = [];

  lines.push('Local Cache:');
  lines.push(`  Total recipes: ${stats.total_recipes}`);
  lines.push(`  Database size: ${formatBytes(stats.db_size)}`);
  lines.push(`  Last sync: ${formatTimestamp(stats.last_sync)}`);

  return lines.join('\n');
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format timestamp to relative time
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;

  // For older dates, show the actual date
  return date.toLocaleDateString();
}

/**
 * Show agent statistics
 * Displays agent identity, cache stats, and feature status
 */
export async function showStats(
  configPath?: string,
  cachePath?: string
): Promise<string> {
  const lines: string[] = [];

  lines.push('Agent Cookbook Statistics');
  lines.push('=========================\n');

  // Load config
  const config = await loadConfig(configPath);

  // Agent identity
  if (config.agent?.public_key) {
    lines.push('Agent Identity:');
    lines.push(`  Public key: ${config.agent.public_key.slice(0, 16)}...`);
    lines.push('');
  } else {
    lines.push('Agent Identity: Not configured');
    lines.push('  Run setup to generate keys');
    lines.push('');
  }

  // Cache stats
  try {
    const cacheStats = await getCacheStats(cachePath);
    lines.push(formatCacheStats(cacheStats));
    lines.push('');
  } catch (err) {
    lines.push('Local Cache: Not initialized');
    lines.push('');
  }

  // Auto-features status
  lines.push('Auto-features:');
  lines.push(
    `  Auto-receipts: ${config.auto_receipts.enabled ? 'enabled ✓' : 'disabled ✗'}`
  );
  lines.push(
    `  Auto-recipes: ${config.auto_recipes.enabled ? 'enabled ✓' : 'disabled ✗'}`
  );
  lines.push('');

  // Registry info
  lines.push('Registry:');
  lines.push(`  URL: ${config.registry.url}`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Show stats for a specific public key (future: fetch from registry)
 * For now, this is a placeholder that returns local stats
 */
export async function showStatsForKey(
  publicKey: string,
  configPath?: string
): Promise<string> {
  const lines: string[] = [];

  lines.push(`Statistics for ${publicKey.slice(0, 16)}...`);
  lines.push('=================================\n');

  // For now, just show local stats
  // In future, could fetch from registry API
  lines.push('Note: Remote stats lookup not yet implemented');
  lines.push('Showing local stats instead:\n');

  const localStats = await showStats(configPath);
  lines.push(localStats);

  return lines.join('\n');
}
