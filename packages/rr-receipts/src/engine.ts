/**
 * Receipt engine - accepts and processes receipt submissions
 */

import { RecipeStore } from '@rr-system/store';
import { Receipt, SubmitReceiptInput } from './types.js';
import { validateReceiptStructure, validateReceiptSignature, calculateGrade } from './validation.js';
import { aggregateReceipt } from './aggregation.js';
import { RateLimiter } from './rate-limit.js';
import { contentHash } from '@rr-system/store';

export class ReceiptEngine {
  private rateLimiter: RateLimiter;

  constructor(private store: RecipeStore) {
    this.rateLimiter = new RateLimiter(100, 60); // 100 receipts per hour
  }

  /**
   * Submit a new receipt
   */
  async submitReceipt(input: SubmitReceiptInput): Promise<Receipt> {
    // Calculate grade from components
    const grade = calculateGrade(input.grade_components);
    const timestamp = new Date().toISOString();

    // Build receipt object
    const receipt: Receipt = {
      receipt_id: '', // Will be set after hashing
      target_id: input.target_id,
      target_type: input.target_type,
      grade,
      grade_components: input.grade_components,
      agent_signature: input.agent_signature,
      agent_public_key: input.agent_public_key,
      timestamp,
    };

    // Generate receipt ID
    receipt.receipt_id = contentHash(
      JSON.stringify({
        target_id: receipt.target_id,
        target_type: receipt.target_type,
        grade: receipt.grade,
        timestamp: receipt.timestamp,
      })
    );

    // Validate structure
    const structureErrors = validateReceiptStructure(receipt);
    if (structureErrors.length > 0) {
      throw new Error(
        `Receipt validation failed: ${structureErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`
      );
    }

    // Verify signature
    const signatureValid = await validateReceiptSignature(receipt);
    if (!signatureValid) {
      throw new Error('Invalid receipt signature');
    }

    // Check rate limit
    if (!this.rateLimiter.isAllowed(receipt.agent_public_key)) {
      throw new Error('Rate limit exceeded: max 100 receipts per hour per agent');
    }

    // Aggregate into summary
    if (input.target_type === 'recipe') {
      await this.aggregateRecipeReceipt(input.target_id, grade, timestamp);
    } else {
      await this.aggregateStepReceipt(input.target_id, grade, timestamp);
    }

    return receipt;
  }

  /**
   * Aggregate receipt for a recipe
   */
  private async aggregateRecipeReceipt(
    recipeId: string,
    grade: number,
    timestamp: string
  ): Promise<void> {
    const recipe = await this.store.getRecipe(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`);
    }

    const newSummary = aggregateReceipt(recipe.receipt_summary, grade, timestamp);
    await this.store.updateReceiptSummary(recipeId, newSummary);
  }

  /**
   * Aggregate receipt for a step
   */
  private async aggregateStepReceipt(
    stepId: string,
    grade: number,
    timestamp: string
  ): Promise<void> {
    // Find recipe containing this step
    const recipeIds = await this.store.listRecipes();

    for (const recipeId of recipeIds) {
      const recipe = await this.store.getRecipe(recipeId);
      if (!recipe) continue;

      const step = recipe.steps.find(s => s.step_id === stepId);
      if (step) {
        const newSummary = aggregateReceipt(step.receipt_summary, grade, timestamp);
        await this.store.updateStepReceiptSummary(recipeId, stepId, newSummary);
        return;
      }
    }

    throw new Error(`Step not found: ${stepId}`);
  }

  /**
   * Get receipt summary for a target
   */
  async getSummary(targetId: string, targetType: 'recipe' | 'step') {
    if (targetType === 'recipe') {
      const recipe = await this.store.getRecipe(targetId);
      return recipe?.receipt_summary || null;
    } else {
      // Find the step
      const recipeIds = await this.store.listRecipes();
      for (const recipeId of recipeIds) {
        const step = await this.store.getStep(recipeId, targetId);
        if (step) {
          return step.receipt_summary || null;
        }
      }
      return null;
    }
  }
}
