/**
 * Tests for auto-recipe module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  detectRecipePattern,
  extractRecipe,
  isRecipeWorthy,
} from './auto-recipe.js';
import type { WorkflowExecution } from './auto-recipe.js';

// Test helper: Create workflow execution
function createWorkflow(
  steps: number,
  hasTests: boolean,
  testsPassed: boolean,
  filesCreated: string[] = [],
  isRepeatable: boolean = true
): WorkflowExecution {
  return {
    steps: Array.from({ length: steps }, (_, i) => ({
      index: i,
      action: `Step ${i + 1}`,
      tool: 'bash',
      result: 'success',
    })),
    hasTests,
    testsPassed,
    filesCreated,
    filesModified: [],
    isRepeatable,
    duration: 1000,
  };
}

test('auto-recipe - detectRecipePattern returns true for valid recipe', () => {
  const workflow = createWorkflow(5, true, true, ['file1.ts', 'file2.ts'], true);
  assert.strictEqual(detectRecipePattern(workflow), true);
});

test('auto-recipe - detectRecipePattern returns false for too few steps', () => {
  const workflow = createWorkflow(2, true, true, ['file1.ts'], true);
  assert.strictEqual(detectRecipePattern(workflow), false);
});

test('auto-recipe - detectRecipePattern returns false for no tests', () => {
  const workflow = createWorkflow(5, false, false, ['file1.ts'], true);
  assert.strictEqual(detectRecipePattern(workflow), false);
});

test('auto-recipe - detectRecipePattern returns false for failing tests', () => {
  const workflow = createWorkflow(5, true, false, ['file1.ts'], true);
  assert.strictEqual(detectRecipePattern(workflow), false);
});

test('auto-recipe - detectRecipePattern returns false for no files created', () => {
  const workflow = createWorkflow(5, true, true, [], true);
  assert.strictEqual(detectRecipePattern(workflow), false);
});

test('auto-recipe - detectRecipePattern returns false for non-repeatable', () => {
  const workflow = createWorkflow(5, true, true, ['file1.ts'], false);
  assert.strictEqual(detectRecipePattern(workflow), false);
});

test('auto-recipe - detectRecipePattern handles trivial workflows', () => {
  const trivialWorkflow: WorkflowExecution = {
    steps: [
      {
        index: 0,
        action: 'npm install',
        tool: 'bash',
        result: 'success',
      },
    ],
    hasTests: false,
    testsPassed: false,
    filesCreated: [],
    filesModified: [],
    isRepeatable: true,
    duration: 100,
  };

  assert.strictEqual(detectRecipePattern(trivialWorkflow), false);
});

test('auto-recipe - isRecipeWorthy checks minimum steps', () => {
  const workflow = createWorkflow(3, true, true, ['file.ts'], true);
  assert.strictEqual(isRecipeWorthy(workflow, 3), true);
  assert.strictEqual(isRecipeWorthy(workflow, 4), false);
});

test('auto-recipe - isRecipeWorthy checks test requirement', () => {
  const withTests = createWorkflow(5, true, true, ['file.ts'], true);
  const withoutTests = createWorkflow(5, false, false, ['file.ts'], true);

  assert.strictEqual(isRecipeWorthy(withTests, 3, true), true);
  assert.strictEqual(isRecipeWorthy(withoutTests, 3, true), false);
  assert.strictEqual(isRecipeWorthy(withoutTests, 3, false), true);
});

test('auto-recipe - extractRecipe generates recipe structure', () => {
  const workflow = createWorkflow(3, true, true, ['file1.ts', 'file2.ts'], true);
  const recipe = extractRecipe(workflow, 'test-recipe');

  assert.strictEqual(recipe.id, 'test-recipe');
  assert.ok(recipe.title.length > 0);
  assert.ok(recipe.description.length > 0);
  assert.strictEqual(recipe.steps.length, 3);
  assert.ok(Array.isArray(recipe.tags));
  assert.ok(recipe.version);
});

test('auto-recipe - extractRecipe includes step details', () => {
  const workflow: WorkflowExecution = {
    steps: [
      {
        index: 0,
        action: 'Create TypeScript config',
        tool: 'write',
        result: 'success',
      },
      {
        index: 1,
        action: 'Install dependencies',
        tool: 'bash',
        result: 'success',
      },
    ],
    hasTests: true,
    testsPassed: true,
    filesCreated: ['tsconfig.json', 'package.json'],
    filesModified: [],
    isRepeatable: true,
    duration: 1000,
  };

  const recipe = extractRecipe(workflow, 'typescript-setup');

  assert.strictEqual(recipe.steps.length, 2);
  assert.ok(recipe.steps[0].title.includes('TypeScript') || recipe.steps[0].spec.includes('Create'));
  assert.strictEqual(recipe.steps[0].index, 0);
  assert.strictEqual(recipe.steps[1].index, 1);
});

test('auto-recipe - extractRecipe sets version', () => {
  const workflow = createWorkflow(3, true, true, ['file.ts'], true);
  const recipe = extractRecipe(workflow, 'test');

  assert.strictEqual(recipe.version, '1.0.0');
});

test('auto-recipe - extractRecipe includes created files in outputs', () => {
  const workflow = createWorkflow(3, true, true, ['file1.ts', 'file2.ts'], true);
  const recipe = extractRecipe(workflow, 'test');

  // At least one step should have outputs
  const hasOutputs = recipe.steps.some((step) => step.outputs.length > 0);
  assert.ok(hasOutputs);
});

test('auto-recipe - extractRecipe generates unique step IDs', () => {
  const workflow = createWorkflow(5, true, true, ['file.ts'], true);
  const recipe = extractRecipe(workflow, 'test');

  const stepIds = recipe.steps.map((s) => s.step_id);
  const uniqueIds = new Set(stepIds);

  assert.strictEqual(stepIds.length, uniqueIds.size);
});

test('auto-recipe - extractRecipe generates appropriate tags', () => {
  const workflow: WorkflowExecution = {
    steps: [
      {
        index: 0,
        action: 'Setup TypeScript project',
        tool: 'write',
        result: 'success',
      },
      {
        index: 1,
        action: 'Install testing framework',
        tool: 'bash',
        result: 'success',
      },
    ],
    hasTests: true,
    testsPassed: true,
    filesCreated: ['tsconfig.json', 'package.json'],
    filesModified: [],
    isRepeatable: true,
    duration: 1000,
  };

  const recipe = extractRecipe(workflow, 'typescript-setup');

  assert.ok(recipe.tags.length > 0);
});

test('auto-recipe - detectRecipePattern rejects one-off workflows', () => {
  const oneOff: WorkflowExecution = {
    steps: [
      {
        index: 0,
        action: 'Fix specific bug in file.ts line 42',
        tool: 'edit',
        result: 'success',
      },
    ],
    hasTests: true,
    testsPassed: true,
    filesCreated: [],
    filesModified: ['file.ts'],
    isRepeatable: false,
    duration: 100,
  };

  assert.strictEqual(detectRecipePattern(oneOff), false);
});
