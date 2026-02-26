/**
 * Filesystem-based storage backend for recipes and index
 */

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { join } from 'path';
import { Recipe, IndexEntry, RecipeStorageBackend } from './types.js';

export class FilesystemStorage implements RecipeStorageBackend {
  private contentDir: string;
  private indexDir: string;

  constructor(baseDir: string) {
    this.contentDir = join(baseDir, 'content');
    this.indexDir = join(baseDir, 'index');
  }

  async init(): Promise<void> {
    await mkdir(this.contentDir, { recursive: true });
    await mkdir(this.indexDir, { recursive: true });
  }

  async storeContent(id: string, recipe: Recipe): Promise<void> {
    const filename = id.replace('sha256:', '') + '.json';
    const filepath = join(this.contentDir, filename);
    await writeFile(filepath, JSON.stringify(recipe, null, 2));
  }

  async getContent(id: string): Promise<Recipe | null> {
    try {
      const filename = id.replace('sha256:', '') + '.json';
      const filepath = join(this.contentDir, filename);
      const data = await readFile(filepath, 'utf-8');
      return JSON.parse(data);
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async storeIndex(entry: IndexEntry): Promise<void> {
    const filename = entry.recipe_id.replace('sha256:', '') + '.json';
    const filepath = join(this.indexDir, filename);
    await writeFile(filepath, JSON.stringify(entry, null, 2));
  }

  async getIndex(id: string): Promise<IndexEntry | null> {
    try {
      const filename = id.replace('sha256:', '') + '.json';
      const filepath = join(this.indexDir, filename);
      const data = await readFile(filepath, 'utf-8');
      return JSON.parse(data);
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async searchByTags(tags: string[]): Promise<IndexEntry[]> {
    const files = await readdir(this.indexDir);
    const results: IndexEntry[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const data = await readFile(join(this.indexDir, file), 'utf-8');
      const entry: IndexEntry = JSON.parse(data);

      // Check if entry has any of the requested tags
      const hasTag = tags.some(tag => entry.tags.includes(tag));
      if (hasTag) {
        results.push(entry);
      }
    }

    return results;
  }

  async listRecipeIds(): Promise<string[]> {
    const files = await readdir(this.contentDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => `sha256:${f.replace('.json', '')}`);
  }
}
