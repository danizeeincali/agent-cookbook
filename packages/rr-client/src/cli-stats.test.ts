/**
 * Tests for CLI stats commands
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { showStats, formatCacheStats } from './cli-stats.js';
import { loadConfig, saveConfig } from './config.js';
import { initCache, cacheRecipes, getCacheStats } from './cache.js';
import type { Recipe } from './types.js';

// Test helper: Create a temporary directory
async function createTempDir(): Promise<string> {
  const tempDir = join(tmpdir(), `agent-cookbook-stats-test-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

// Test helper: Clean up temp directory
async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (err) {
    // Ignore errors
  }
}

// Test helper: Create sample recipe
function createSampleRecipe(id: string): Recipe {
  return {
    id,
    title: `Recipe ${id}`,
    description: 'Test recipe',
    tags: ['test'],
    version: '1.0.0',
    steps: [],
    receipt_summary: {
      total_runs: 10,
      grade_avg: 0.9,
      last_verified: '2024-01-01T00:00:00Z',
    },
    created_at: '2024-01-01T00:00:00Z',
  };
}

test('cli-stats - showStats displays config info', async () => {
  const tempDir = await createTempDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create config with agent keys
    const config = await loadConfig(configPath);
    config.agent = {
      public_key: 'test_public_key_12345678',
      private_key: 'test_private_key',
    };
    await saveConfig(config, configPath);

    const output = await showStats(configPath);

    // Should show public key
    assert.ok(output.includes('test_public_key'));
    assert.ok(output.includes('Statistics') || output.includes('statistics'));
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-stats - showStats displays cache info', async () => {
  const tempDir = await createTempDir();
  const configPath = join(tempDir, 'config.json');
  const cachePath = join(tempDir, 'cache.db');

  try {
    // Create config
    await loadConfig(configPath);

    // Create cache with recipes
    await initCache(cachePath);
    const recipes = [createSampleRecipe('recipe-1'), createSampleRecipe('recipe-2')];
    await cacheRecipes(recipes, cachePath);

    const output = await showStats(configPath, cachePath);

    // Should show cache stats
    assert.ok(output.includes('2') || output.includes('recipes'));
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-stats - formatCacheStats formats cache info', async () => {
  const tempDir = await createTempDir();
  const cachePath = join(tempDir, 'cache.db');

  try {
    // Create cache
    await initCache(cachePath);
    await cacheRecipes([createSampleRecipe('recipe-1')], cachePath);

    const stats = await getCacheStats(cachePath);
    const output = formatCacheStats(stats);

    // Should contain key info
    assert.ok(output.includes('1') || output.includes('recipe'));
    assert.ok(output.includes('size') || output.includes('Size'));
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-stats - formatCacheStats handles empty cache', async () => {
  const tempDir = await createTempDir();
  const cachePath = join(tempDir, 'cache.db');

  try {
    // Create empty cache
    await initCache(cachePath);

    const stats = await getCacheStats(cachePath);
    const output = formatCacheStats(stats);

    // Should show 0 recipes
    assert.ok(output.includes('0'));
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-stats - showStats handles missing cache gracefully', async () => {
  const tempDir = await createTempDir();
  const configPath = join(tempDir, 'config.json');
  const cachePath = join(tempDir, 'nonexistent.db');

  try {
    // Create config but no cache
    await loadConfig(configPath);

    const output = await showStats(configPath, cachePath);

    // Should not throw, should show something
    assert.ok(output.length > 0);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-stats - showStats includes auto-features status', async () => {
  const tempDir = await createTempDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create config with features disabled
    const config = await loadConfig(configPath);
    config.auto_receipts.enabled = false;
    config.auto_recipes.enabled = true;
    await saveConfig(config, configPath);

    const output = await showStats(configPath);

    // Should show feature status
    assert.ok(output.includes('auto') || output.includes('Auto'));
  } finally {
    await cleanupTempDir(tempDir);
  }
});
