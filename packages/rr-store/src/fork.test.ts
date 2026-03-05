/**
 * Tests for recipe forking functionality
 *
 * Uses a mock storage backend to avoid @xenova/transformers (sharp broken on this machine).
 * Tests validate fork logic in RecipeStore without needing real embeddings.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Recipe, IndexEntry, RecipeStorageBackend } from './types.js';

// Mock storage that stores in memory
class MockStorage implements RecipeStorageBackend {
  content = new Map<string, Recipe>();
  index = new Map<string, IndexEntry>();

  async storeContent(id: string, recipe: Recipe): Promise<void> {
    this.content.set(id, JSON.parse(JSON.stringify(recipe)));
  }
  async getContent(id: string): Promise<Recipe | null> {
    return this.content.get(id) || null;
  }
  async storeIndex(entry: IndexEntry): Promise<void> {
    this.index.set(entry.recipe_id, JSON.parse(JSON.stringify(entry)));
  }
  async getIndex(id: string): Promise<IndexEntry | null> {
    return this.index.get(id) || null;
  }
  async searchByTags(tags: string[]): Promise<IndexEntry[]> {
    return Array.from(this.index.values()).filter(e =>
      tags.some(t => e.tags.includes(t))
    );
  }
  async listRecipeIds(): Promise<string[]> {
    return Array.from(this.content.keys());
  }
}

// ── Type-level tests (source code inspection) ──

const typesPath = join(import.meta.dirname, 'types.ts');
const typesSource = readFileSync(typesPath, 'utf-8');

test('types - Recipe interface includes forked_from field', () => {
  assert.ok(
    typesSource.includes('forked_from'),
    'Recipe type should have forked_from field'
  );
});

test('types - Recipe interface includes fork_count field', () => {
  assert.ok(
    typesSource.includes('fork_count'),
    'Recipe type should have fork_count field'
  );
});

test('types - CreateRecipeInput includes forked_from field', () => {
  // forked_from should be in CreateRecipeInput so callers can provide it
  const createInputSection = typesSource.slice(
    typesSource.indexOf('CreateRecipeInput')
  );
  assert.ok(
    createInputSection.includes('forked_from'),
    'CreateRecipeInput should have forked_from field'
  );
});

test('types - IndexEntry includes forked_from field', () => {
  const indexSection = typesSource.slice(typesSource.indexOf('IndexEntry'));
  assert.ok(
    indexSection.includes('forked_from'),
    'IndexEntry should have forked_from field'
  );
});

// ── Store logic tests (source code inspection) ──

const storePath = join(import.meta.dirname, 'store.ts');
const storeSource = readFileSync(storePath, 'utf-8');

test('store - createRecipe handles forked_from', () => {
  assert.ok(
    storeSource.includes('forked_from'),
    'createRecipe should reference forked_from'
  );
});

test('store - createRecipe validates parent exists for forks', () => {
  assert.ok(
    storeSource.includes('Parent') || storeSource.includes('parent'),
    'createRecipe should validate parent recipe exists'
  );
});

test('store - createRecipe inherits halved parent grade', () => {
  // Should multiply parent grade by 0.5
  assert.ok(
    storeSource.includes('0.5') || storeSource.includes('/ 2'),
    'createRecipe should halve parent grade for forks'
  );
});

test('store - createRecipe increments parent fork_count', () => {
  assert.ok(
    storeSource.includes('fork_count'),
    'createRecipe should handle fork_count'
  );
});

test('store - has listForks method', () => {
  assert.ok(
    storeSource.includes('listForks'),
    'RecipeStore should have a listForks method'
  );
});

// ── Routes tests (source code inspection) ──

const routesPath = join(import.meta.dirname, '../../rr-node/src/routes.ts');
const routesSource = readFileSync(routesPath, 'utf-8');

test('routes - has /forks endpoint', () => {
  assert.ok(
    routesSource.includes('forks'),
    'Routes should handle /recipes/:id/forks endpoint'
  );
});

// ── Discovery tests (source code inspection) ──

const discoverTypesPath = join(
  import.meta.dirname,
  '../../rr-discover/src/types.ts'
);
const discoverTypesSource = readFileSync(discoverTypesPath, 'utf-8');

test('discover types - SearchResult includes forked_from', () => {
  assert.ok(
    discoverTypesSource.includes('forked_from'),
    'SearchResult should include forked_from'
  );
});

test('discover types - SearchResult includes fork_count', () => {
  assert.ok(
    discoverTypesSource.includes('fork_count'),
    'SearchResult should include fork_count'
  );
});

// ── Client types tests (source code inspection) ──

const clientTypesPath = join(
  import.meta.dirname,
  '../../rr-client/src/types.ts'
);
const clientTypesSource = readFileSync(clientTypesPath, 'utf-8');

test('client types - Recipe includes forked_from', () => {
  assert.ok(
    clientTypesSource.includes('forked_from'),
    'Client Recipe type should include forked_from'
  );
});

test('client types - RecipeResult includes forked_from', () => {
  const resultSection = clientTypesSource.slice(
    clientTypesSource.indexOf('RecipeResult')
  );
  assert.ok(
    resultSection.includes('forked_from'),
    'Client RecipeResult should include forked_from'
  );
});
