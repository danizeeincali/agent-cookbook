/**
 * R&R Client SDK - Main client class
 */

import {
  Recipe,
  RecipeStep,
  RecipeResult,
  SubmitReceiptOptions,
  RRClientConfig,
  GradeComponents,
} from './types.js';
import { generateAgentKey, signReceiptMessage } from './crypto.js';
import { HTTPClient } from './http.js';

export class RRClient {
  private http: HTTPClient;

  constructor(config: RRClientConfig) {
    this.http = new HTTPClient(config.baseUrl, config.timeout);
  }

  /**
   * Discover recipes by natural language query
   */
  async discover(query: string, topK: number = 5): Promise<RecipeResult[]> {
    const params = new URLSearchParams({
      q: query,
      top_k: topK.toString(),
    });

    const response = await this.http.get<{ results: RecipeResult[] }>(
      `/discover?${params}`
    );

    return response.results;
  }

  /**
   * Discover recipes by tags
   */
  async discoverByTags(tags: string[], topK: number = 10): Promise<RecipeResult[]> {
    const params = new URLSearchParams({
      tags: tags.join(','),
      top_k: topK.toString(),
    });

    const response = await this.http.get<{ results: RecipeResult[] }>(
      `/discover?${params}`
    );

    return response.results;
  }

  /**
   * Search for individual steps
   */
  async discoverStep(query: string, topK: number = 5): Promise<any[]> {
    const params = new URLSearchParams({
      q: query,
      top_k: topK.toString(),
    });

    const response = await this.http.get<{ results: any[] }>(
      `/discover/step?${params}`
    );

    return response.results;
  }

  /**
   * Fetch a full recipe
   */
  async getRecipe(recipeId: string): Promise<Recipe> {
    return this.http.get<Recipe>(`/recipes/${recipeId}`);
  }

  /**
   * Fetch a single step
   */
  async getStep(recipeId: string, stepId: string): Promise<RecipeStep> {
    return this.http.get<RecipeStep>(`/recipes/${recipeId}/steps/${stepId}`);
  }

  /**
   * Get all steps from a recipe
   */
  async getSteps(recipeId: string): Promise<RecipeStep[]> {
    return this.http.get<RecipeStep[]>(`/recipes/${recipeId}/steps`);
  }

  /**
   * List all forks of a recipe
   */
  async listForks(recipeId: string): Promise<RecipeResult[]> {
    const response = await this.http.get<{ forks: RecipeResult[] }>(
      `/recipes/${recipeId}/forks`
    );
    return response.forks;
  }

  /**
   * Submit a receipt after building from a recipe
   */
  async submitReceipt(options: SubmitReceiptOptions): Promise<void> {
    const timestamp = new Date().toISOString();

    // Calculate grade from components
    const grade = this.calculateGrade(options.gradeComponents);

    // Sign the receipt
    const signature = await signReceiptMessage(
      options.targetId,
      grade,
      timestamp,
      options.agentKeyPair.privateKey
    );

    // Submit to server
    await this.http.post('/receipts', {
      target_id: options.targetId,
      target_type: options.targetType,
      grade_components: options.gradeComponents,
      agent_signature: signature,
      agent_public_key: options.agentKeyPair.publicKey,
    });
  }

  /**
   * Generate ephemeral key pair for this agent session
   */
  async generateAgentKey() {
    return generateAgentKey();
  }

  /**
   * Calculate weighted grade from components
   */
  private calculateGrade(components: GradeComponents): number {
    const weights = {
      correctness: 0.4,
      performance: 0.2,
      security_scan: 0.2,
      test_coverage: 0.2,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const [key, value] of Object.entries(components)) {
      if (value !== undefined && value !== null) {
        const weight = weights[key as keyof typeof weights] || 0;
        weightedSum += value * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
}
