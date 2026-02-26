/**
 * Recipe store with CRUD operations and vector embedding
 */

import { Recipe, RecipeStep, CreateRecipeInput, IndexEntry, RecipeStorageBackend } from './types.js';
import { hashRecipe, hashStep } from './hash.js';
import { generateRecipeEmbedding } from './embeddings.js';

export class RecipeStore {
  constructor(private storage: RecipeStorageBackend) {}

  /**
   * Create a new recipe
   */
  async createRecipe(input: CreateRecipeInput): Promise<Recipe> {
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

    // Store full content
    await this.storage.storeContent(recipeId, recipe);

    // Store index entry
    const indexEntry: IndexEntry = {
      recipe_id: recipeId,
      title: recipe.title,
      tags: recipe.tags,
      embedding_ref: `sha256:${recipeId}`,
      content_ref: `sha256:${recipeId}`,
      step_count: steps.length,
      updated_at: recipe.created_at,
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
