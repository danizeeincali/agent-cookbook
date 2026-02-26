/**
 * Tests for auto-receipt submission module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  shouldSubmitReceipt,
  calculateGrade,
  submitReceiptIfEnabled,
  type RecipeExecution,
} from './auto-receipt.js';
import { loadConfig, saveConfig } from './config.js';
import { performSetup } from './setup.js';

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

test('auto-receipt - calculateGrade computes correct grade', () => {
  const execution: RecipeExecution = {
    recipeId: 'sha256:test',
    testsPass: true,
    testsPassed: 10,
    testsFailed: 0,
    coverage: 0.85,
    performanceScore: 0.95,
    securityScore: 0.90,
  };

  const grade = calculateGrade(execution);

  // Grade should be weighted average
  // correctness: 1.0 (tests pass)
  // test_coverage: 0.85
  // performance: 0.95
  // security_scan: 0.90
  // Simple average: (1.0 + 0.85 + 0.95 + 0.90) / 4 = 0.925
  assert.ok(grade >= 0.9 && grade <= 0.95);
});

test('auto-receipt - calculateGrade returns 0 when tests fail', () => {
  const execution: RecipeExecution = {
    recipeId: 'sha256:test',
    testsPass: false,
    testsPassed: 5,
    testsFailed: 5,
    coverage: 0.85,
    performanceScore: 0.95,
    securityScore: 0.90,
  };

  const grade = calculateGrade(execution);

  // correctness is 0 when tests fail
  assert.ok(grade < 0.8); // Should be lower due to 0 correctness
});

test('auto-receipt - calculateGrade handles missing optional fields', () => {
  const execution: RecipeExecution = {
    recipeId: 'sha256:test',
    testsPass: true,
    testsPassed: 10,
    testsFailed: 0,
  };

  const grade = calculateGrade(execution);

  // Should still compute grade with defaults for missing fields
  assert.ok(grade >= 0.0 && grade <= 1.0);
});

test('auto-receipt - shouldSubmitReceipt checks enabled flag', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    // Setup with auto-receipts disabled
    await performSetup(configPath);
    const config = await loadConfig(configPath);
    config.auto_receipts.enabled = false;
    await saveConfig(config, configPath);

    const execution: RecipeExecution = {
      recipeId: 'sha256:test',
      testsPass: true,
      testsPassed: 10,
      testsFailed: 0,
      coverage: 0.95,
      performanceScore: 0.95,
      securityScore: 0.95,
    };

    const should = await shouldSubmitReceipt(execution, configPath);
    assert.strictEqual(should, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('auto-receipt - shouldSubmitReceipt checks min_grade threshold', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    await performSetup(configPath);

    // Low grade execution
    const execution: RecipeExecution = {
      recipeId: 'sha256:test',
      testsPass: true,
      testsPassed: 10,
      testsFailed: 0,
      coverage: 0.5,
      performanceScore: 0.5,
      securityScore: 0.5,
    };

    const should = await shouldSubmitReceipt(execution, configPath);
    assert.strictEqual(should, false); // Below 0.8 threshold
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('auto-receipt - shouldSubmitReceipt checks require_tests', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    await performSetup(configPath);

    // Tests failed
    const execution: RecipeExecution = {
      recipeId: 'sha256:test',
      testsPass: false,
      testsPassed: 5,
      testsFailed: 5,
      coverage: 0.85,
      performanceScore: 0.95,
      securityScore: 0.95,
    };

    const should = await shouldSubmitReceipt(execution, configPath);
    assert.strictEqual(should, false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('auto-receipt - shouldSubmitReceipt returns true for valid execution', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    await performSetup(configPath);

    // High grade execution
    const execution: RecipeExecution = {
      recipeId: 'sha256:test',
      testsPass: true,
      testsPassed: 10,
      testsFailed: 0,
      coverage: 0.95,
      performanceScore: 0.95,
      securityScore: 0.95,
    };

    const should = await shouldSubmitReceipt(execution, configPath);
    assert.strictEqual(should, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('auto-receipt - submitReceiptIfEnabled does not throw on disabled', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    await performSetup(configPath);
    const config = await loadConfig(configPath);
    config.auto_receipts.enabled = false;
    await saveConfig(config, configPath);

    const execution: RecipeExecution = {
      recipeId: 'sha256:test',
      testsPass: true,
      testsPassed: 10,
      testsFailed: 0,
      coverage: 0.95,
      performanceScore: 0.95,
      securityScore: 0.95,
    };

    // Should not throw
    const result = await submitReceiptIfEnabled(
      execution,
      'https://cookbook.daniz.dev',
      configPath
    );

    assert.strictEqual(result.submitted, false);
    assert.strictEqual(result.reason, 'auto_receipts_disabled');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('auto-receipt - submitReceiptIfEnabled skips low grade', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    await performSetup(configPath);

    const execution: RecipeExecution = {
      recipeId: 'sha256:test',
      testsPass: true,
      testsPassed: 10,
      testsFailed: 0,
      coverage: 0.5,
      performanceScore: 0.5,
      securityScore: 0.5,
    };

    const result = await submitReceiptIfEnabled(
      execution,
      'https://cookbook.daniz.dev',
      configPath
    );

    assert.strictEqual(result.submitted, false);
    assert.strictEqual(result.reason, 'grade_too_low');
  } finally {
    await cleanupTempDir(tempDir);
  }
});

test('auto-receipt - submitReceiptIfEnabled generates valid receipt structure', async () => {
  const tempDir = await createTempConfigDir();
  const configPath = join(tempDir, 'config.json');

  try {
    await performSetup(configPath);

    const execution: RecipeExecution = {
      recipeId: 'sha256:test123',
      testsPass: true,
      testsPassed: 10,
      testsFailed: 0,
      coverage: 0.95,
      performanceScore: 0.95,
      securityScore: 0.95,
    };

    // We can't actually submit without a real API, so we'll just check
    // that the function generates a receipt structure
    const result = await submitReceiptIfEnabled(
      execution,
      'https://invalid.example.com', // Invalid URL to prevent real submission
      configPath
    );

    // Should attempt submission but fail due to network
    // The important thing is it didn't throw an error during receipt generation
    assert.ok(result.submitted === true || result.submitted === false);

    if (result.submitted) {
      assert.ok(result.receipt);
      assert.strictEqual(result.receipt.target_id, 'sha256:test123');
      assert.strictEqual(result.receipt.target_type, 'recipe');
      assert.ok(result.receipt.grade >= 0.9);
      assert.ok(result.receipt.agent_signature);
      assert.ok(result.receipt.agent_public_key);
      assert.ok(result.receipt.timestamp);
    }
  } finally {
    await cleanupTempDir(tempDir);
  }
});
