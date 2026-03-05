/**
 * Recipe store with CRUD operations and vector embedding
 */

import { Recipe, RecipeStep, CreateRecipeInput, IndexEntry, RecipeStorageBackend } from './types.js';
import { hashRecipe, hashStep } from './hash.js';
import { generateRecipeEmbedding } from './embeddings.js';

export class RecipeStore {
  constructor(private storage: RecipeStorageBackend) {}

  /**
   * Create a new recipe (optionally forked from a parent)
   */
  async createRecipe(input: CreateRecipeInput): Promise<Recipe> {
    // If forking, validate parent exists and get its grade
    let parentGradeAvg = 0;
    if (input.forked_from) {
      const parent = await this.storage.getContent(input.forked_from);
      if (!parent) {
        throw new Error(`Parent recipe not found: ${input.forked_from}`);
      }
      parentGradeAvg = parent.receipt_summary?.grade_avg || 0;
    }

    // Generate step IDs
    const steps: RecipeStep[] = input.steps.map(step => ({
      ...step,
      step_id: hashStep(step),
    }));

    // Generate recipe ID from content
    const recipeId = hashRecipe({
      title: input.title,
      description: input.description,
      version: input.version,
      steps: input.steps,
    });

    // Generate embedding
    const embedding = await generateRecipeEmbedding({
      title: input.title,
      description: input.description,
      steps: input.steps,
    });

    const recipe: Recipe = {
      id: recipeId,
      title: input.title,
      description: input.description,
      tags: input.tags,
      embedding,
      version: input.version,
      steps,
      created_at: new Date().toISOString(),
    };

    // Fork metadata
    if (input.forked_from) {
      recipe.forked_from = input.forked_from;

      // Inherit halved parent grade
      if (parentGradeAvg > 0) {
        recipe.receipt_summary = {
          total_runs: 0,
          grade_avg: Math.round(parentGradeAvg * 0.5 * 100) / 100,
          last_verified: recipe.created_at,
        };
      }

      // Increment parent's fork_count
      const parent = await this.storage.getContent(input.forked_from);
      if (parent) {
        parent.fork_count = (parent.fork_count || 0) + 1;
        await this.storage.storeContent(input.forked_from, parent);

        // Update parent index
        const parentIndex = await this.storage.getIndex(input.forked_from);
        if (parentIndex) {
          parentIndex.fork_count = parent.fork_count;
          await this.storage.storeIndex(parentIndex);
        }
      }
    }

    // Store full content
    await this.storage.storeContent(recipeId, recipe);

    // Store index entry
    const indexEntry: IndexEntry = {
      recipe_id: recipeId,
      title: recipe.title,
      tags: recipe.tags,
      embedding_ref: `sha256:${recipeId}`,
      content_ref: `sha256:${recipeId}`,
      receipt_summary: recipe.receipt_summary,
      step_count: steps.length,
      updated_at: recipe.created_at,
      forked_from: recipe.forked_from,
    };

    await this.storage.storeIndex(indexEntry);

    return recipe;
  }

  /**
   * Get full recipe by ID
   */
  async getRecipe(id: string): Promise<Recipe | null> {
    return this.storage.getContent(id);
  }

  /**
   * Get single step from a recipe
   */
  async getStep(recipeId: string, stepId: string): Promise<RecipeStep | null> {
    const recipe = await this.storage.getContent(recipeId);
    if (!recipe) return null;

    const step = recipe.steps.find(s => s.step_id === stepId);
    return step || null;
  }

  /**
   * Get all steps from a recipe
   */
  async getSteps(recipeId: string): Promise<RecipeStep[]> {
    const recipe = await this.storage.getContent(recipeId);
    return recipe?.steps || [];
  }

  /**
   * Search recipes by tags
   */
  async searchByTags(tags: string[]): Promise<IndexEntry[]> {
    return this.storage.searchByTags(tags);
  }

  /**
   * Get index entry for a recipe
   */
  async getIndexEntry(recipeId: string): Promise<IndexEntry | null> {
    return this.storage.getIndex(recipeId);
  }

  /**
   * List all recipe IDs
   */
  async listRecipes(): Promise<string[]> {
    return this.storage.listRecipeIds();
  }

  /**
   * Update receipt summary for a recipe
   */
  async updateReceiptSummary(
    recipeId: string,
    summary: Recipe['receipt_summary']
  ): Promise<void> {
    const recipe = await this.storage.getContent(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    recipe.receipt_summary = summary;
    await this.storage.storeContent(recipeId, recipe);

    // Update index entry
    const indexEntry = await this.storage.getIndex(recipeId);
    if (indexEntry) {
      indexEntry.receipt_summary = summary;
      indexEntry.updated_at = new Date().toISOString();
      await this.storage.storeIndex(indexEntry);
    }
  }

  /**
   * List all forks of a recipe
   */
  async listForks(recipeId: string): Promise<IndexEntry[]> {
    const allIds = await this.storage.listRecipeIds();
    const forks: IndexEntry[] = [];

    for (const id of allIds) {
      const index = await this.storage.getIndex(id);
      if (index && index.forked_from === recipeId) {
        forks.push(index);
      }
    }

    return forks;
  }

  /**
   * Update receipt summary for a step
   */
  async updateStepReceiptSummary(
    recipeId: string,
    stepId: string,
    summary: RecipeStep['receipt_summary']
  ): Promise<void> {
    const recipe = await this.storage.getContent(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const stepIndex = recipe.steps.findIndex(s => s.step_id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step not found: ${stepId}`);
    }

    recipe.steps[stepIndex].receipt_summary = summary;
    await this.storage.storeContent(recipeId, recipe);
  }
}
