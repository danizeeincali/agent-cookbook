/**
 * Auto-receipt submission
 * Automatically submit success receipts when recipes execute successfully
 */

import { loadConfig } from './config.js';
import { signReceipt } from '@agent-cookbook/receipts';
import type { GradeComponents } from './types.js';

/**
 * Recipe execution result
 */
export interface RecipeExecution {
  recipeId: string;
  testsPass: boolean;
  testsPassed: number;
  testsFailed: number;
  coverage?: number; // 0.0 - 1.0
  performanceScore?: number; // 0.0 - 1.0
  securityScore?: number; // 0.0 - 1.0
}

/**
 * Receipt submission result
 */
export interface SubmitReceiptResult {
  submitted: boolean;
  reason?: string;
  receipt?: {
    target_id: string;
    target_type: 'recipe' | 'step';
    grade: number;
    grade_components: GradeComponents;
    agent_signature: string;
    agent_public_key: string;
    timestamp: string;
  };
  error?: string;
}

/**
 * Calculate grade from execution results
 *
 * Grade components:
 * - correctness: 1.0 if tests pass, 0.0 if tests fail
 * - test_coverage: actual coverage (0.0 - 1.0)
 * - performance: performance score (0.0 - 1.0)
 * - security_scan: security score (0.0 - 1.0)
 *
 * Grade is simple average of all components
 */
export function calculateGrade(execution: RecipeExecution): number {
  const components: GradeComponents = {
    correctness: execution.testsPass ? 1.0 : 0.0,
    test_coverage: execution.coverage ?? 0.0,
    performance: execution.performanceScore ?? 0.0,
    security_scan: execution.securityScore ?? 0.0,
  };

  // Simple average of all components
  const values = Object.values(components).filter((v) => v !== undefined) as number[];
  const grade = values.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.max(0.0, Math.min(1.0, grade)); // Clamp to [0.0, 1.0]
}

/**
 * Calculate grade components from execution
 */
export function getGradeComponents(execution: RecipeExecution): GradeComponents {
  return {
    correctness: execution.testsPass ? 1.0 : 0.0,
    test_coverage: execution.coverage ?? 0.0,
    performance: execution.performanceScore ?? 0.0,
    security_scan: execution.securityScore ?? 0.0,
  };
}

/**
 * Check if receipt should be submitted based on config and execution
 */
export async function shouldSubmitReceipt(
  execution: RecipeExecution,
  configPath?: string
): Promise<boolean> {
  const config = await loadConfig(configPath);

  // Check if auto-receipts enabled
  if (!config.auto_receipts.enabled) {
    return false;
  }

  // Check if tests are required and passed
  if (config.auto_receipts.require_tests && !execution.testsPass) {
    return false;
  }

  // Calculate grade and check threshold
  const grade = calculateGrade(execution);
  if (grade < config.auto_receipts.min_grade) {
    return false;
  }

  return true;
}

/**
 * Submit receipt if enabled and conditions are met
 *
 * Silent by default - only logs if submission fails
 */
export async function submitReceiptIfEnabled(
  execution: RecipeExecution,
  registryUrl: string,
  configPath?: string
): Promise<SubmitReceiptResult> {
  // Load config outside try/catch so it's accessible in catch
  let config;

  try {
    config = await loadConfig(configPath);

    // Check if should submit
    const shouldSubmit = await shouldSubmitReceipt(execution, configPath);
    if (!shouldSubmit) {
      // Determine reason
      let reason = 'unknown';
      if (!config.auto_receipts.enabled) {
        reason = 'auto_receipts_disabled';
      } else if (config.auto_receipts.require_tests && !execution.testsPass) {
        reason = 'tests_failed';
      } else {
        const grade = calculateGrade(execution);
        if (grade < config.auto_receipts.min_grade) {
          reason = 'grade_too_low';
        }
      }

      return {
        submitted: false,
        reason,
      };
    }

    // Check if agent keys exist
    if (!config.agent?.private_key || !config.agent?.public_key) {
      return {
        submitted: false,
        reason: 'missing_agent_keys',
      };
    }

    // Calculate grade
    const grade = calculateGrade(execution);
    const gradeComponents = getGradeComponents(execution);
    const timestamp = new Date().toISOString();

    // Sign receipt
    const signature = await signReceipt(
      execution.recipeId,
      grade,
      timestamp,
      config.agent.private_key
    );

    // Build receipt
    const receipt = {
      target_id: execution.recipeId,
      target_type: 'recipe' as const,
      grade,
      grade_components: gradeComponents,
      agent_signature: signature,
      agent_public_key: config.agent.public_key,
      timestamp,
    };

    // Submit to registry
    const response = await fetch(`${registryUrl}/api/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(receipt),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        submitted: false,
        reason: 'api_error',
        error: `API returned ${response.status}: ${errorText}`,
      };
    }

    // Success
    return {
      submitted: true,
      receipt,
    };
  } catch (error) {
    // Silent failure - just log and return
    if (!config?.auto_receipts.silent) {
      console.error('Failed to submit receipt:', error);
    }

    return {
      submitted: false,
      reason: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Submit receipt in background (fire-and-forget)
 *
 * This is the main entry point for auto-receipt submission.
 * It submits the receipt silently in the background and does not
 * throw errors or block execution.
 */
export function submitReceiptInBackground(
  execution: RecipeExecution,
  registryUrl: string,
  configPath?: string
): void {
  // Fire and forget - don't await
  submitReceiptIfEnabled(execution, registryUrl, configPath).catch(() => {
    // Silent failure - do nothing
  });
}
