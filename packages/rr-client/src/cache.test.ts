/**
 * Tests for cache module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initCache,
  cacheRecipes,
  searchCache,
  getFromCache,
  clearCache,
  getCacheStats,
  getCachePath,
} from './cache.js';
import type { Recipe } from './types.js';

// Test helper: Create a temporary cache directory
async function createTempCacheDir(): Promise<string> {
  const tempDir = join(tmpdir(), `agent-cookbook-cache-test-${Date.now()}`);
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

// Test helper: Create sample recipes
function createSampleRecipes(): Recipe[] {
  return [
    {
      id: 'recipe-1',
      title: 'Setup TypeScript Project',
      description: 'Initialize a TypeScript project with tests',
      tags: ['typescript', 'setup', 'testing'],
      version: '1.0.0',
      steps: [
        {
          step_id: 'step-1',
          index: 0,
          title: 'Initialize npm project',
          spec: 'Run npm init',
          inputs: [],
          outputs: ['package.json'],
        },
      ],
      receipt_summary: {
        total_runs: 100,
        grade_avg: 0.95,
        last_verified: '2024-01-01T00:00:00Z',
      },
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'recipe-2',
      title: 'Build REST API',
      description: 'Create a REST API with Express',
      tags: ['api', 'express', 'nodejs'],
      version: '1.0.0',
      steps: [
        {
          step_id: 'step-2',
          index: 0,
          title: 'Setup Express',
          spec: 'Install and configure Express',
          inputs: [],
          outputs: ['server.js'],
        },
      ],
      receipt_summary: {
        total_runs: 50,
        grade_avg: 0.88,
        last_verified: '2024-01-02T00:00:00Z',
      },
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'recipe-3',
      title: 'TypeScript Testing Framework',
      description: 'Setup comprehensive testing with TypeScript',
      tags: ['typescript', 'testing', 'jest'],
      version: '1.0.0',
      steps: [
        {
          step_id: 'step-3',
          index: 0,
          title: 'Install Jest',
          spec: 'Setup Jest for TypeScript',
          inputs: [],
          outputs: ['jest.config.js'],
        },
      ],
      receipt_summary: {
        total_runs: 75,
        grade_avg: 0.92,
        last_verified: '2024-01-03T00:00:00Z',
      },
      created_at: '2024-01-03T00:00:00Z',
    },
  ];
}

test('cache - getCachePath returns default path', () => {
  const path = getCachePath();
  assert.ok(path.includes('.agent-cookbook'));
  assert.ok(path.includes('cache'));
  assert.ok(path.endsWith('recipes.db'));
});

test('cache - getCachePath accepts custom path', () => {
  const customPath = '/tmp/custom-cache.db';
  const path = getCachePath(customPath);
  assert.strictEqual(path, customPath);
});

test('cache - initCache creates database and schema', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);

    // Database should exist and have correct schema
    const stats = await getCacheStats(cachePath);
    assert.strictEqual(stats.total_recipes, 0);
    assert.ok(stats.db_size >= 0);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - initCache is idempotent', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    await initCache(cachePath); // Should not throw

    const stats = await getCacheStats(cachePath);
    assert.strictEqual(stats.total_recipes, 0);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - cacheRecipes stores recipes', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();

    await cacheRecipes(recipes, cachePath);

    const stats = await getCacheStats(cachePath);
    assert.strictEqual(stats.total_recipes, 3);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - cacheRecipes updates existing recipes', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();

    // Cache first time
    await cacheRecipes(recipes, cachePath);

    // Update and cache again
    recipes[0].receipt_summary!.grade_avg = 0.99;
    await cacheRecipes(recipes, cachePath);

    // Should still have 3 recipes
    const stats = await getCacheStats(cachePath);
    assert.strictEqual(stats.total_recipes, 3);

    // Check updated grade
    const recipe = await getFromCache('recipe-1', cachePath);
    assert.strictEqual(recipe?.receipt_summary?.grade_avg, 0.99);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - getFromCache retrieves single recipe', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();
    await cacheRecipes(recipes, cachePath);

    const recipe = await getFromCache('recipe-1', cachePath);
    assert.ok(recipe);
    assert.strictEqual(recipe.id, 'recipe-1');
    assert.strictEqual(recipe.title, 'Setup TypeScript Project');
    assert.strictEqual(recipe.receipt_summary?.grade_avg, 0.95);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - getFromCache returns null for non-existent recipe', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);

    const recipe = await getFromCache('non-existent', cachePath);
    assert.strictEqual(recipe, null);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - searchCache finds recipes by title', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();
    await cacheRecipes(recipes, cachePath);

    const results = await searchCache('TypeScript', cachePath, 10);

    // Should find 2 recipes with "TypeScript" in title
    assert.ok(results.length >= 2);
    assert.ok(results.some((r) => r.id === 'recipe-1'));
    assert.ok(results.some((r) => r.id === 'recipe-3'));
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - searchCache finds recipes by tags', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();
    await cacheRecipes(recipes, cachePath);

    const results = await searchCache('testing', cachePath, 10);

    // Should find recipes with "testing" tag
    assert.ok(results.length >= 2);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - searchCache respects limit parameter', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();
    await cacheRecipes(recipes, cachePath);

    const results = await searchCache('typescript', cachePath, 1);

    assert.strictEqual(results.length, 1);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - searchCache orders by grade_avg', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();
    await cacheRecipes(recipes, cachePath);

    const results = await searchCache('typescript', cachePath, 10);

    // Results should be ordered by grade (highest first)
    // recipe-1 has 0.95, recipe-3 has 0.92
    assert.ok(results.length >= 2);
    const grades = results.map((r) => r.receipt_summary?.grade_avg || 0);
    for (let i = 1; i < grades.length; i++) {
      assert.ok(grades[i - 1] >= grades[i], 'Results should be ordered by grade');
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - searchCache returns empty array for no matches', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();
    await cacheRecipes(recipes, cachePath);

    const results = await searchCache('nonexistent-query-xyz', cachePath, 10);

    assert.strictEqual(results.length, 0);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - clearCache removes all recipes', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();
    await cacheRecipes(recipes, cachePath);

    // Verify recipes are cached
    let stats = await getCacheStats(cachePath);
    assert.strictEqual(stats.total_recipes, 3);

    // Clear cache
    await clearCache(cachePath);

    // Verify cache is empty
    stats = await getCacheStats(cachePath);
    assert.strictEqual(stats.total_recipes, 0);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - getCacheStats returns accurate statistics', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);
    const recipes = createSampleRecipes();
    await cacheRecipes(recipes, cachePath);

    const stats = await getCacheStats(cachePath);

    assert.strictEqual(stats.total_recipes, 3);
    assert.ok(stats.db_size > 0);
    assert.ok(stats.last_sync);
    assert.ok(new Date(stats.last_sync).getTime() > 0);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - handles recipes without receipt_summary', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);

    const recipe: Recipe = {
      id: 'recipe-no-summary',
      title: 'Recipe without summary',
      description: 'Test recipe',
      tags: ['test'],
      version: '1.0.0',
      steps: [],
      created_at: '2024-01-01T00:00:00Z',
      // No receipt_summary
    };

    await cacheRecipes([recipe], cachePath);

    const retrieved = await getFromCache('recipe-no-summary', cachePath);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, 'recipe-no-summary');
    assert.strictEqual(retrieved.receipt_summary, undefined);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cache - searchCache handles empty cache', async () => {
  const tempDir = await createTempCacheDir();
  const cachePath = join(tempDir, 'recipes.db');

  try {
    await initCache(cachePath);

    const results = await searchCache('anything', cachePath, 10);

    assert.strictEqual(results.length, 0);
  } finally {
    await cleanupTempDir(tempDir);
  }
});
