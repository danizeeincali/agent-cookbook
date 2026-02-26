/**
 * Core types for R&R Store package
 */

export interface ReceiptSummary {
  total_runs: number;
  grade_avg: number;
  grade_p10?: number;
  last_verified: string;
}

export interface RecipeStep {
  step_id: string;
  index: number;
  title: string;
  spec: string;
  inputs: string[];
  outputs: string[];
  receipt_summary?: ReceiptSummary;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  tags: string[];
  embedding: number[];
  version: string;
  steps: RecipeStep[];
  receipt_summary?: ReceiptSummary;
  created_at: string;
}

export interface IndexEntry {
  recipe_id: string;
  title: string;
  tags: string[];
  embedding_ref: string;
  content_ref: string;
  receipt_summary?: ReceiptSummary;
  step_count: number;
  updated_at: string;
}

export interface CreateRecipeInput {
  title: string;
  description: string;
  tags: string[];
  version: string;
  steps: Omit<RecipeStep, 'step_id' | 'receipt_summary'>[];
}

export interface RecipeStorageBackend {
  /**
   * Store full recipe content
   */
  storeContent(id: string, recipe: Recipe): Promise<void>;

  /**
   * Retrieve full recipe content
   */
  getContent(id: string): Promise<Recipe | null>;

  /**
   * Store index entry
   */
  storeIndex(entry: IndexEntry): Promise<void>;

  /**
   * Get index entry
   */
  getIndex(id: string): Promise<IndexEntry | null>;

  /**
   * Search index entries by tags
   */
  searchByTags(tags: string[]): Promise<IndexEntry[]>;

  /**
   * List all recipe IDs
   */
  listRecipeIds(): Promise<string[]>;
}
