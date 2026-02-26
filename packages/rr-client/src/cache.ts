/**
 * Local cache module for recipe metadata
 * Uses SQLite for storage with TTL-based invalidation
 */

import Database from 'better-sqlite3';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { mkdir, stat } from 'node:fs/promises';
import type { Recipe } from './types.js';

/**
 * Cache statistics
 */
export interface CacheStats {
  total_recipes: number;
  db_size: number; // bytes
  last_sync: string; // ISO timestamp
}

/**
 * Get default cache path
 */
export function getCachePath(customPath?: string): string {
  if (customPath) {
    return customPath;
  }
  return join(homedir(), '.agent-cookbook', 'cache', 'recipes.db');
}

/**
 * Initialize cache database
 * Creates SQLite DB and schema if not exists
 * Idempotent: safe to call multiple times
 */
export async function initCache(cachePath?: string): Promise<void> {
  const path = getCachePath(cachePath);

  // Ensure directory exists
  await mkdir(dirname(path), { recursive: true });

  // Open/create database
  const db = new Database(path);

  try {
    // Create schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS recipes (
        recipe_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        tags TEXT,
        category TEXT,
        grade_avg REAL,
        total_runs INTEGER,
        contributors INTEGER,
        last_verified TEXT,
        embedding TEXT,
        data TEXT NOT NULL,
        cached_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_title ON recipes(title);
      CREATE INDEX IF NOT EXISTS idx_grade ON recipes(grade_avg DESC);
      CREATE INDEX IF NOT EXISTS idx_cached_at ON recipes(cached_at);

      CREATE TABLE IF NOT EXISTS cache_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Initialize metadata
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO cache_metadata (key, value) VALUES (?, ?)'
    );
    stmt.run('last_sync', new Date().toISOString());
  } finally {
    db.close();
  }
}

/**
 * Cache recipes in local database
 * Updates existing recipes if they already exist
 */
export async function cacheRecipes(
  recipes: Recipe[],
  cachePath?: string
): Promise<void> {
  const path = getCachePath(cachePath);

  // Ensure database exists
  await initCache(path);

  const db = new Database(path);

  try {
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO recipes (
        recipe_id, title, description, tags, category,
        grade_avg, total_runs, contributors, last_verified,
        embedding, data, cached_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const recipe of recipes) {
      const tags = JSON.stringify(recipe.tags || []);
      const category = recipe.tags?.[0] || 'general';
      const gradeAvg = recipe.receipt_summary?.grade_avg ?? null;
      const totalRuns = recipe.receipt_summary?.total_runs ?? null;
      const contributors = null; // Not in current schema
      const lastVerified = recipe.receipt_summary?.last_verified ?? null;
      const embedding = null; // TODO: Generate embeddings for semantic search
      const data = JSON.stringify(recipe);
      const cachedAt = new Date().toISOString();

      insertStmt.run(
        recipe.id,
        recipe.title,
        recipe.description,
        tags,
        category,
        gradeAvg,
        totalRuns,
        contributors,
        lastVerified,
        embedding,
        data,
        cachedAt
      );
    }

    // Update last_sync timestamp
    const updateMetaStmt = db.prepare(
      'INSERT OR REPLACE INTO cache_metadata (key, value) VALUES (?, ?)'
    );
    updateMetaStmt.run('last_sync', new Date().toISOString());
  } finally {
    db.close();
  }
}

/**
 * Get a single recipe from cache
 * Returns null if not found
 */
export async function getFromCache(
  recipeId: string,
  cachePath?: string
): Promise<Recipe | null> {
  const path = getCachePath(cachePath);

  // Ensure database exists
  await initCache(path);

  const db = new Database(path);

  try {
    const stmt = db.prepare('SELECT data FROM recipes WHERE recipe_id = ?');
    const row = stmt.get(recipeId) as { data: string } | undefined;

    if (!row) {
      return null;
    }

    return JSON.parse(row.data) as Recipe;
  } finally {
    db.close();
  }
}

/**
 * Search cached recipes by query
 * Searches in title, description, and tags
 * Returns results ordered by grade (highest first)
 */
export async function searchCache(
  query: string,
  cachePath?: string,
  limit: number = 10
): Promise<Recipe[]> {
  const path = getCachePath(cachePath);

  // Ensure database exists
  await initCache(path);

  const db = new Database(path);

  try {
    // Simple text search in title, description, and tags
    // Case-insensitive search using LIKE
    const searchPattern = `%${query.toLowerCase()}%`;

    const stmt = db.prepare(`
      SELECT data
      FROM recipes
      WHERE
        LOWER(title) LIKE ? OR
        LOWER(description) LIKE ? OR
        LOWER(tags) LIKE ?
      ORDER BY
        grade_avg DESC,
        total_runs DESC
      LIMIT ?
    `);

    const rows = stmt.all(searchPattern, searchPattern, searchPattern, limit) as {
      data: string;
    }[];

    return rows.map((row) => JSON.parse(row.data) as Recipe);
  } finally {
    db.close();
  }
}

/**
 * Clear all cached recipes
 */
export async function clearCache(cachePath?: string): Promise<void> {
  const path = getCachePath(cachePath);

  // Ensure database exists
  await initCache(path);

  const db = new Database(path);

  try {
    db.exec('DELETE FROM recipes');

    // Update last_sync timestamp
    const updateMetaStmt = db.prepare(
      'INSERT OR REPLACE INTO cache_metadata (key, value) VALUES (?, ?)'
    );
    updateMetaStmt.run('last_sync', new Date().toISOString());
  } finally {
    db.close();
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(cachePath?: string): Promise<CacheStats> {
  const path = getCachePath(cachePath);

  // Ensure database exists
  await initCache(path);

  const db = new Database(path);

  try {
    // Get total recipes
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM recipes');
    const countRow = countStmt.get() as { count: number };
    const totalRecipes = countRow.count;

    // Get last sync time
    const syncStmt = db.prepare(
      'SELECT value FROM cache_metadata WHERE key = ?'
    );
    const syncRow = syncStmt.get('last_sync') as { value: string } | undefined;
    const lastSync = syncRow?.value || new Date().toISOString();

    // Get database size
    let dbSize = 0;
    try {
      const stats = await stat(path);
      dbSize = stats.size;
    } catch {
      // Database doesn't exist yet
    }

    return {
      total_recipes: totalRecipes,
      db_size: dbSize,
      last_sync: lastSync,
    };
  } finally {
    db.close();
  }
}

/**
 * Check if cache is stale based on TTL
 * Default TTL: 1 hour (3600 seconds)
 */
export async function isCacheStale(
  ttlSeconds: number = 3600,
  cachePath?: string
): Promise<boolean> {
  const path = getCachePath(cachePath);

  try {
    const stats = await getCacheStats(path);
    const lastSyncTime = new Date(stats.last_sync).getTime();
    const now = Date.now();
    const ageSeconds = (now - lastSyncTime) / 1000;

    return ageSeconds > ttlSeconds;
  } catch {
    // Cache doesn't exist, consider it stale
    return true;
  }
}
