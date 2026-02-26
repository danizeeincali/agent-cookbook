/**
 * Tests for first-use setup module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  isFirstUse,
  performSetup,
  getSetupStatus,
} from './setup.js';
import type { CookbookConfig } from './config.js';

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

test('setup - isFirstUse returns true when no config exists', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const firstUse = await isFirstUse(configPath);
    assert.strictEqual(firstUse, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('setup - isFirstUse returns false when config exists', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Perform setup
    await performSetup(configPath);

    // Check if it's first use
    const firstUse = await isFirstUse(configPath);
    assert.strictEqual(firstUse, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('setup - performSetup creates config file', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const config = await performSetup(configPath);

    // Config should exist
    const fileContent = await readFile(configPath, 'utf-8');
    const savedConfig = JSON.parse(fileContent);

    assert.strictEqual(savedConfig.version, '1.0.0');
    assert.strictEqual(config.version, '1.0.0');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('setup - performSetup generates Ed25519 keypair', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const config = await performSetup(configPath);

    // Should have agent keys
    assert.ok(config.agent);
    assert.ok(config.agent.public_key);
    assert.ok(config.agent.private_key);
    assert.ok(config.agent.public_key.length > 0);
    assert.ok(config.agent.private_key.length > 0);

    // Keys should be hex strings (Ed25519 keys are 64 hex chars for 32 bytes)
    assert.strictEqual(config.agent.public_key.length, 64);
    assert.strictEqual(config.agent.private_key.length, 64);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('setup - performSetup uses default opt-out config', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const config = await performSetup(configPath);

    // Should have opt-out defaults
    assert.strictEqual(config.auto_receipts.enabled, true);
    assert.strictEqual(config.auto_receipts.min_grade, 0.8);
    assert.strictEqual(config.auto_receipts.require_tests, true);
    assert.strictEqual(config.auto_receipts.silent, true);
    assert.strictEqual(config.auto_recipes.enabled, true);
    assert.strictEqual(config.auto_recipes.min_steps, 3);
    assert.strictEqual(config.auto_recipes.require_tests, true);
    assert.strictEqual(config.auto_recipes.confirm, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('setup - performSetup is idempotent', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // First setup
    const config1 = await performSetup(configPath);
    const publicKey1 = config1.agent?.public_key;

    // Second setup should not regenerate keys
    const config2 = await performSetup(configPath);
    const publicKey2 = config2.agent?.public_key;

    assert.strictEqual(publicKey1, publicKey2);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('setup - getSetupStatus returns complete status', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    await performSetup(configPath);

    const status = await getSetupStatus(configPath);

    assert.strictEqual(status.is_first_use, false);
    assert.strictEqual(status.has_config, true);
    assert.strictEqual(status.has_agent_keys, true);
    assert.ok(status.public_key);
    assert.ok(status.public_key.length === 64);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('setup - getSetupStatus returns incomplete status for new install', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    const status = await getSetupStatus(configPath);

    assert.strictEqual(status.is_first_use, true);
    assert.strictEqual(status.has_config, false);
    assert.strictEqual(status.has_agent_keys, false);
    assert.strictEqual(status.public_key, undefined);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('setup - performSetup preserves existing config settings', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // First setup
    const config1 = await performSetup(configPath);

    // Modify config
    config1.auto_receipts.enabled = false;
    const { saveConfig } = await import('./config.js');
    await saveConfig(config1, configPath);

    // Second setup should preserve settings
    const config2 = await performSetup(configPath);
    assert.strictEqual(config2.auto_receipts.enabled, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('setup - performSetup creates cache directory', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    await performSetup(configPath);

    // Cache directory should exist
    const { access } = await import('node:fs/promises');
    const cacheDir = join(tempDir, 'cache');

    // Should not throw
    await access(cacheDir);
  } finally {
    await cleanupTempDir(tempDir);
  }
});
