import pg from 'pg';
import { Recipe, IndexEntry, RecipeStorageBackend } from './types.js';

const { Pool } = pg;

export class PostgresStorage implements RecipeStorageBackend {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    const useSSL = connectionString.includes('sslmode=require') ||
      process.env.PGSSLMODE === 'require';

    this.pool = new Pool({
      connectionString,
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_index (
        recipe_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  async storeContent(id: string, recipe: Recipe): Promise<void> {
    await this.pool.query(
      `INSERT INTO recipes (id, data, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [id, JSON.stringify(recipe), recipe.created_at || new Date().toISOString()]
    );
  }

  async getContent(id: string): Promise<Recipe | null> {
    const result = await this.pool.query(
      'SELECT data FROM recipes WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].data as Recipe;
  }

  async storeIndex(entry: IndexEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO recipe_index (recipe_id, data, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (recipe_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [entry.recipe_id, JSON.stringify(entry), entry.updated_at || new Date().toISOString()]
    );
  }

  async getIndex(id: string): Promise<IndexEntry | null> {
    const result = await this.pool.query(
      'SELECT data FROM recipe_index WHERE recipe_id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].data as IndexEntry;
  }

  async searchByTags(tags: string[]): Promise<IndexEntry[]> {
    const result = await this.pool.query(
      `SELECT data FROM recipe_index
       WHERE data->'tags' ?| $1`,
      [tags]
    );
    return result.rows.map(r => r.data as IndexEntry);
  }

  async listRecipeIds(): Promise<string[]> {
    const result = await this.pool.query('SELECT id FROM recipes');
    return result.rows.map(r => r.id);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
