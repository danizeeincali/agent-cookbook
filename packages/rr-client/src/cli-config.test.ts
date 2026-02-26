/**
 * Tests for CLI config commands
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  showConfig,
  disableAutoReceipts,
  disableAutoRecipes,
  disableAllAuto,
  resetConfigCommand,
} from './cli-config.js';
import { loadConfig, saveConfig } from './config.js';

// Test helper: Create a temporary config directory
async function createTempConfigDir(): Promise<string> {
  const tempDir = join(tmpdir(), `agent-cookbook-cli-test-${Date.now()}`);
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

test('cli-config - showConfig returns formatted config', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create config with defaults
    const config = await loadConfig(configPath);
    config.agent = {
      public_key: 'test_public_key_1234567890abcdef',
      private_key: 'test_private_key',
    };
    await saveConfig(config, configPath);

    const output = await showConfig(configPath);

    // Should contain key information
    assert.ok(output.includes('Auto-receipts') || output.includes('auto-receipts'));
    assert.ok(output.includes('Enabled') || output.includes('enabled'));
    assert.ok(output.includes('Auto-recipes') || output.includes('auto-recipes'));
    assert.ok(output.includes('test_public_key'));
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-config - showConfig shows privacy info', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    await loadConfig(configPath);
    const output = await showConfig(configPath);

    assert.ok(output.includes('privacy') || output.includes('Privacy'));
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-config - disableAutoReceipts sets enabled to false', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create config with defaults (auto-receipts enabled)
    await loadConfig(configPath);

    // Disable auto-receipts
    await disableAutoReceipts(configPath);

    // Verify it's disabled
    const config = await loadConfig(configPath);
    assert.strictEqual(config.auto_receipts.enabled, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-config - disableAutoReceipts preserves other settings', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create config
    const config = await loadConfig(configPath);
    config.auto_receipts.min_grade = 0.75;
    config.auto_recipes.enabled = true;
    await saveConfig(config, configPath);

    // Disable auto-receipts
    await disableAutoReceipts(configPath);

    // Verify other settings preserved
    const updated = await loadConfig(configPath);
    assert.strictEqual(updated.auto_receipts.min_grade, 0.75);
    assert.strictEqual(updated.auto_recipes.enabled, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-config - disableAutoRecipes sets enabled to false', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create config with defaults (auto-recipes enabled)
    await loadConfig(configPath);

    // Disable auto-recipes
    await disableAutoRecipes(configPath);

    // Verify it's disabled
    const config = await loadConfig(configPath);
    assert.strictEqual(config.auto_recipes.enabled, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-config - disableAutoRecipes preserves other settings', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create config
    const config = await loadConfig(configPath);
    config.auto_recipes.min_steps = 5;
    config.auto_receipts.enabled = true;
    await saveConfig(config, configPath);

    // Disable auto-recipes
    await disableAutoRecipes(configPath);

    // Verify other settings preserved
    const updated = await loadConfig(configPath);
    assert.strictEqual(updated.auto_recipes.min_steps, 5);
    assert.strictEqual(updated.auto_receipts.enabled, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-config - disableAllAuto disables both features', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create config with defaults (both enabled)
    await loadConfig(configPath);

    // Disable all auto features
    await disableAllAuto(configPath);

    // Verify both disabled
    const config = await loadConfig(configPath);
    assert.strictEqual(config.auto_receipts.enabled, false);
    assert.strictEqual(config.auto_recipes.enabled, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-config - disableAllAuto preserves other settings', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create config with custom values
    const config = await loadConfig(configPath);
    config.auto_receipts.min_grade = 0.85;
    config.auto_recipes.min_steps = 5;
    await saveConfig(config, configPath);

    // Disable all
    await disableAllAuto(configPath);

    // Verify settings preserved
    const updated = await loadConfig(configPath);
    assert.strictEqual(updated.auto_receipts.min_grade, 0.85);
    assert.strictEqual(updated.auto_recipes.min_steps, 5);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-config - resetConfigCommand resets to defaults', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create and modify config
    const config = await loadConfig(configPath);
    config.auto_receipts.enabled = false;
    config.auto_receipts.min_grade = 0.5;
    config.auto_recipes.enabled = false;
    config.agent = {
      public_key: 'test_key',
      private_key: 'test_private',
    };
    await saveConfig(config, configPath);

    // Reset
    await resetConfigCommand(configPath);

    // Verify defaults restored
    const reset = await loadConfig(configPath);
    assert.strictEqual(reset.auto_receipts.enabled, true);
    assert.strictEqual(reset.auto_receipts.min_grade, 0.8);
    assert.strictEqual(reset.auto_recipes.enabled, true);

    // Agent keys should be preserved
    assert.strictEqual(reset.agent?.public_key, 'test_key');
    assert.strictEqual(reset.agent?.private_key, 'test_private');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('cli-config - resetConfigCommand works on first use', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Reset without existing config
    await resetConfigCommand(configPath);

    // Should create default config
    const config = await loadConfig(configPath);
    assert.strictEqual(config.auto_receipts.enabled, true);
    assert.strictEqual(config.auto_recipes.enabled, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});
