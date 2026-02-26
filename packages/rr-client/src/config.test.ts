/**
 * Tests for config module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadConfig,
  saveConfig,
  resetConfig,
  getConfigPath,
  type CookbookConfig,
} from './config.js';

// Test helper: Create a temporary config directory
async function createTempConfigDir(): Promise<string> {
  const tempDir = join(tmpdir(), `agent-cookbook-test-${Date.now()}`);
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

test('config - getConfigPath returns default path', () => {
  const path = getConfigPath();
  assert.ok(path.includes('.agent-cookbook'));
  assert.ok(path.endsWith('config.json'));
});

test('config - getConfigPath accepts custom path', () => {
  const customPath = '/tmp/custom-config.json';
  const path = getConfigPath(customPath);
  assert.strictEqual(path, customPath);
});

test('config - loadConfig returns default config on first use', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const config = await loadConfig(configPath);

    // Check default values
    assert.strictEqual(config.version, '1.0.0');
    assert.strictEqual(config.auto_receipts.enabled, true);
    assert.strictEqual(config.auto_receipts.min_grade, 0.8);
    assert.strictEqual(config.auto_receipts.require_tests, true);
    assert.strictEqual(config.auto_receipts.silent, true);
    assert.strictEqual(config.auto_recipes.enabled, true);
    assert.strictEqual(config.auto_recipes.min_steps, 3);
    assert.strictEqual(config.auto_recipes.require_tests, true);
    assert.strictEqual(config.auto_recipes.confirm, true);
    assert.strictEqual(config.privacy.anonymous, true);
    assert.strictEqual(config.privacy.public_key_only, true);

    // Config should be written to disk
    const fileContent = await readFile(configPath, 'utf-8');
    const savedConfig = JSON.parse(fileContent);
    assert.strictEqual(savedConfig.version, '1.0.0');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('config - loadConfig loads existing config', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Create a custom config
    const customConfig: Partial<CookbookConfig> = {
      version: '1.0.0',
      auto_receipts: {
        enabled: false,
        min_grade: 0.9,
        require_tests: false,
        silent: false,
      },
    };

    await writeFile(configPath, JSON.stringify(customConfig, null, 2));

    // Load config
    const config = await loadConfig(configPath);

    // Should merge with defaults
    assert.strictEqual(config.auto_receipts.enabled, false);
    assert.strictEqual(config.auto_receipts.min_grade, 0.9);
    assert.strictEqual(config.auto_receipts.require_tests, false);
    assert.strictEqual(config.auto_receipts.silent, false);

    // Other fields should have defaults
    assert.strictEqual(config.auto_recipes.enabled, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('config - saveConfig writes config to disk', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const config = await loadConfig(configPath);

    // Modify config
    config.auto_receipts.enabled = false;
    config.auto_receipts.min_grade = 0.9;

    // Save config
    await saveConfig(config, configPath);

    // Verify written to disk
    const fileContent = await readFile(configPath, 'utf-8');
    const savedConfig = JSON.parse(fileContent);
    assert.strictEqual(savedConfig.auto_receipts.enabled, false);
    assert.strictEqual(savedConfig.auto_receipts.min_grade, 0.9);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('config - saveConfig preserves agent keys', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const config = await loadConfig(configPath);

    // Add agent keys
    config.agent = {
      public_key: 'test_public_key',
      private_key: 'test_private_key',
    };

    await saveConfig(config, configPath);

    // Load again
    const reloadedConfig = await loadConfig(configPath);
    assert.strictEqual(reloadedConfig.agent?.public_key, 'test_public_key');
    assert.strictEqual(reloadedConfig.agent?.private_key, 'test_private_key');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('config - resetConfig restores defaults', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Load and modify config
    const config = await loadConfig(configPath);
    config.auto_receipts.enabled = false;
    config.auto_receipts.min_grade = 0.5;
    config.agent = {
      public_key: 'test_key',
      private_key: 'test_private',
    };
    await saveConfig(config, configPath);

    // Reset config
    const resetted = await resetConfig(configPath);

    // Should have defaults
    assert.strictEqual(resetted.auto_receipts.enabled, true);
    assert.strictEqual(resetted.auto_receipts.min_grade, 0.8);

    // Should preserve agent keys
    assert.strictEqual(resetted.agent?.public_key, 'test_key');
    assert.strictEqual(resetted.agent?.private_key, 'test_private');

    // Verify written to disk
    const fileContent = await readFile(configPath, 'utf-8');
    const savedConfig = JSON.parse(fileContent);
    assert.strictEqual(savedConfig.auto_receipts.enabled, true);
    assert.strictEqual(savedConfig.agent?.public_key, 'test_key');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('config - handles missing config directory', async () => {
  const tempDir = await createTempConfigDir();
  await cleanupTempDir(tempDir); // Remove it immediately
  const configPath = join(tempDir, 'config.json');

  try {
    // Should create directory and config
    const config = await loadConfig(configPath);
    assert.strictEqual(config.version, '1.0.0');

    // Verify file exists
    const fileContent = await readFile(configPath, 'utf-8');
    const savedConfig = JSON.parse(fileContent);
    assert.strictEqual(savedConfig.version, '1.0.0');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('config - handles corrupted config file', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Write invalid JSON
    await writeFile(configPath, 'invalid json {{{');

    // Should return defaults and overwrite file
    const config = await loadConfig(configPath);
    assert.strictEqual(config.version, '1.0.0');

    // Verify file was fixed
    const fileContent = await readFile(configPath, 'utf-8');
    const savedConfig = JSON.parse(fileContent);
    assert.strictEqual(savedConfig.version, '1.0.0');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('config - validates min_grade range', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const config = await loadConfig(configPath);

    // Try invalid grades
    config.auto_receipts.min_grade = 1.5; // > 1.0
    await saveConfig(config, configPath);

    const reloaded = await loadConfig(configPath);
    // Should clamp to 1.0
    assert.ok(reloaded.auto_receipts.min_grade <= 1.0);

    config.auto_receipts.min_grade = -0.5; // < 0.0
    await saveConfig(config, configPath);

    const reloaded2 = await loadConfig(configPath);
    // Should clamp to 0.0
    assert.ok(reloaded2.auto_receipts.min_grade >= 0.0);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('config - validates min_steps range', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const config = await loadConfig(configPath);

    // Try invalid steps
    config.auto_recipes.min_steps = -1;
    await saveConfig(config, configPath);

    const reloaded = await loadConfig(configPath);
    // Should clamp to minimum 1
    assert.ok(reloaded.auto_recipes.min_steps >= 1);
  } finally {
    await cleanupTempDir(tempDir);
  }
});
