/**
 * Semantic search implementation
 */

import { RecipeStore, generateEmbedding, cosineSimilarity } from '@agent-cookbook/store';
import { SearchResult, SearchQuery, StepSearchResult } from './types.js';

export class DiscoveryService {
  constructor(private store: RecipeStore) {}

  /**
   * Search recipes by natural language query
   * Hybrid ranking: 0.7 * semantic_similarity + 0.3 * grade_avg
   */
  async searchRecipes(query: SearchQuery): Promise<SearchResult[]> {
    const topK = query.topK || 5;

    // If tags are provided, filter by tags first
    let candidateIds: string[];
    if (query.tags && query.tags.length > 0) {
      const entries = await this.store.searchByTags(query.tags);
      candidateIds = entries.map((e: any) => e.recipe_id);
    } else {
      candidateIds = await this.store.listRecipes();
    }

    // If no query text, return tag-filtered results
    if (!query.query) {
      const results: SearchResult[] = [];
      for (const id of candidateIds.slice(0, topK)) {
        const entry = await this.store.getIndexEntry(id);
        if (entry) {
          results.push({
            recipe_id: entry.recipe_id,
            title: entry.title,
            score: entry.receipt_summary?.grade_avg || 0,
            grade_avg: entry.receipt_summary?.grade_avg,
            total_runs: entry.receipt_summary?.total_runs,
            step_count: entry.step_count,
            fetch_url: `/recipes/${entry.recipe_id}`,
            forked_from: entry.forked_from,
            fork_count: entry.fork_count,
          });
        }
      }
      return results;
    }

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query.query);

    // Score all candidates
    const scored: Array<SearchResult & { similarity: number }> = [];

    for (const id of candidateIds) {
      const recipe = await this.store.getRecipe(id);
      if (!recipe) continue;

      const similarity = cosineSimilarity(queryEmbedding, recipe.embedding);
      const gradeAvg = recipe.receipt_summary?.grade_avg || 0;

      // Hybrid score: 0.7 * similarity + 0.3 * grade
      const score = 0.7 * similarity + 0.3 * gradeAvg;

      scored.push({
        recipe_id: recipe.id,
        title: recipe.title,
        score,
        similarity,
        grade_avg: recipe.receipt_summary?.grade_avg,
        total_runs: recipe.receipt_summary?.total_runs,
        step_count: recipe.steps.length,
        fetch_url: `/recipes/${recipe.id}`,
        forked_from: recipe.forked_from,
        fork_count: recipe.fork_count,
      });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top K
    return scored.slice(0, topK).map(({ similarity, ...rest }) => rest);
  }

  /**
   * Search at step level
   */
  async searchSteps(query: SearchQuery): Promise<StepSearchResult[]> {
    const topK = query.topK || 5;

    if (!query.query) {
      throw new Error('Query text required for step search');
    }

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query.query);

    // Get all recipes
    const recipeIds = await this.store.listRecipes();

    // Score all steps
    const scored: Array<StepSearchResult & { similarity: number }> = [];

    for (const recipeId of recipeIds) {
      const recipe = await this.store.getRecipe(recipeId);
      if (!recipe) continue;

      for (const step of recipe.steps) {
        // Generate step embedding from spec
        const stepEmbedding = await generateEmbedding(step.spec);
        const similarity = cosineSimilarity(queryEmbedding, stepEmbedding);
        const gradeAvg = step.receipt_summary?.grade_avg || 0;

        // Hybrid score
        const score = 0.7 * similarity + 0.3 * gradeAvg;

        scored.push({
          recipe_id: recipe.id,
          step_id: step.step_id,
          recipe_title: recipe.title,
          step_title: step.title,
          score,
          similarity,
          grade_avg: step.receipt_summary?.grade_avg,
          total_runs: step.receipt_summary?.total_runs,
          fetch_url: `/recipes/${recipe.id}/steps/${step.step_id}`,
        });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top K
    return scored.slice(0, topK).map(({ similarity, ...rest }) => rest);
  }
}
