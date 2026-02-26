/**
 * Auto-recipe creation module
 * Detects recipe-worthy workflows and generates recipe structures
 */

import type { Recipe, RecipeStep } from './types.js';

/**
 * Workflow step execution
 */
export interface WorkflowStep {
  index: number;
  action: string; // Description of what was done
  tool: string; // Tool used (bash, write, edit, etc.)
  result: 'success' | 'failure';
}

/**
 * Workflow execution data
 */
export interface WorkflowExecution {
  steps: WorkflowStep[];
  hasTests: boolean;
  testsPassed: boolean;
  filesCreated: string[];
  filesModified: string[];
  isRepeatable: boolean; // Not a one-off fix
  duration: number; // milliseconds
}

/**
 * Check if workflow meets criteria for recipe creation
 *
 * Criteria:
 * - Minimum number of steps (default 3)
 * - Has tests that pass (if required)
 * - Creates/modifies files
 * - Is repeatable (not one-off)
 * - Not trivial (not just "npm install")
 */
export function isRecipeWorthy(
  workflow: WorkflowExecution,
  minSteps: number = 3,
  requireTests: boolean = true
): boolean {
  // Check minimum steps
  if (workflow.steps.length < minSteps) {
    return false;
  }

  // Check test requirement
  if (requireTests && (!workflow.hasTests || !workflow.testsPassed)) {
    return false;
  }

  // Check if it creates or modifies files
  if (workflow.filesCreated.length === 0 && workflow.filesModified.length === 0) {
    return false;
  }

  // Must be repeatable
  if (!workflow.isRepeatable) {
    return false;
  }

  // Check if it's trivial (single command like npm install)
  if (workflow.steps.length === 1) {
    const action = workflow.steps[0].action.toLowerCase();
    const trivialPatterns = [
      'npm install',
      'npm i',
      'yarn install',
      'pnpm install',
      'git clone',
    ];
    if (trivialPatterns.some((pattern) => action.includes(pattern))) {
      return false;
    }
  }

  return true;
}

/**
 * Detect if workflow matches recipe pattern
 * Uses default config values (can be customized via config)
 */
export function detectRecipePattern(workflow: WorkflowExecution): boolean {
  return isRecipeWorthy(workflow, 3, true);
}

/**
 * Extract recipe structure from workflow execution
 */
export function extractRecipe(
  workflow: WorkflowExecution,
  recipeId: string
): Recipe {
  // Generate title from first few steps
  const title = generateTitle(workflow);

  // Generate description
  const description = generateDescription(workflow);

  // Generate tags
  const tags = generateTags(workflow);

  // Convert workflow steps to recipe steps
  const steps = workflow.steps.map((step, index) => {
    const recipeStep: RecipeStep = {
      step_id: `${recipeId}-step-${index}`,
      index,
      title: step.action,
      spec: generateStepSpec(step),
      inputs: determineInputs(step, workflow),
      outputs: determineOutputs(step, workflow),
    };
    return recipeStep;
  });

  const recipe: Recipe = {
    id: recipeId,
    title,
    description,
    tags,
    version: '1.0.0',
    steps,
    created_at: new Date().toISOString(),
  };

  return recipe;
}

/**
 * Generate recipe title from workflow
 */
function generateTitle(workflow: WorkflowExecution): string {
  // Use first step or most significant step
  const firstStep = workflow.steps[0];
  if (!firstStep) {
    return 'Automated Workflow';
  }

  // Clean up the action to make a nice title
  let title = firstStep.action;

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // Limit length
  if (title.length > 60) {
    title = title.slice(0, 57) + '...';
  }

  return title;
}

/**
 * Generate recipe description
 */
function generateDescription(workflow: WorkflowExecution): string {
  const lines: string[] = [];

  // Summarize what the workflow does
  lines.push(
    `Automated workflow with ${workflow.steps.length} step${workflow.steps.length === 1 ? '' : 's'}.`
  );

  if (workflow.filesCreated.length > 0) {
    lines.push(`Creates ${workflow.filesCreated.length} file(s).`);
  }

  if (workflow.filesModified.length > 0) {
    lines.push(`Modifies ${workflow.filesModified.length} file(s).`);
  }

  if (workflow.hasTests && workflow.testsPassed) {
    lines.push('Includes passing tests.');
  }

  return lines.join(' ');
}

/**
 * Generate tags from workflow
 */
function generateTags(workflow: WorkflowExecution): string[] {
  const tags: Set<string> = new Set();

  // Add tags based on files created
  for (const file of workflow.filesCreated) {
    const ext = file.split('.').pop()?.toLowerCase();
    if (ext) {
      // Map file extensions to tags
      const extToTag: Record<string, string> = {
        ts: 'typescript',
        js: 'javascript',
        py: 'python',
        go: 'golang',
        rs: 'rust',
        java: 'java',
        json: 'config',
        yaml: 'config',
        yml: 'config',
        md: 'documentation',
      };

      const tag = extToTag[ext];
      if (tag) {
        tags.add(tag);
      }
    }

    // Add specific file name tags
    if (file.includes('test')) {
      tags.add('testing');
    }
    if (file.includes('package.json')) {
      tags.add('nodejs');
    }
    if (file.includes('tsconfig')) {
      tags.add('typescript');
    }
  }

  // Add tags based on actions
  for (const step of workflow.steps) {
    const action = step.action.toLowerCase();

    if (action.includes('test')) {
      tags.add('testing');
    }
    if (action.includes('setup') || action.includes('init')) {
      tags.add('setup');
    }
    if (action.includes('api') || action.includes('rest')) {
      tags.add('api');
    }
    if (action.includes('database') || action.includes('db')) {
      tags.add('database');
    }
  }

  // Always add 'automated' tag
  tags.add('automated');

  return Array.from(tags);
}

/**
 * Generate spec for a recipe step
 */
function generateStepSpec(step: WorkflowStep): string {
  // The spec is a detailed description of what to do
  // For now, just use the action
  return step.action;
}

/**
 * Determine inputs for a step
 */
function determineInputs(
  step: WorkflowStep,
  workflow: WorkflowExecution
): string[] {
  // For the first step, inputs are typically empty
  if (step.index === 0) {
    return [];
  }

  // Otherwise, inputs might be files modified in previous steps
  const previousSteps = workflow.steps.slice(0, step.index);
  const inputs: Set<string> = new Set();

  // This is simplified - in a real implementation, we'd track file dependencies
  // For now, just return empty array
  return Array.from(inputs);
}

/**
 * Determine outputs for a step
 */
function determineOutputs(
  step: WorkflowStep,
  workflow: WorkflowExecution
): string[] {
  // If this step creates files, those are outputs
  // For simplicity, we'll distribute created files across steps
  const outputs: string[] = [];

  if (workflow.filesCreated.length > 0) {
    // Assign files to steps based on index
    const filesPerStep = Math.ceil(
      workflow.filesCreated.length / workflow.steps.length
    );
    const startIdx = step.index * filesPerStep;
    const endIdx = Math.min(
      startIdx + filesPerStep,
      workflow.filesCreated.length
    );

    outputs.push(...workflow.filesCreated.slice(startIdx, endIdx));
  }

  return outputs;
}

/**
 * Confirm recipe submission with user
 * Returns true if user confirms, false otherwise
 *
 * In a real implementation, this would prompt the user.
 * For testing, we just return true (default yes)
 */
export async function confirmRecipeSubmission(recipe: Recipe): Promise<boolean> {
  // In production, this would:
  // 1. Show recipe preview
  // 2. Prompt user: "Submit this recipe? (Y/n)"
  // 3. Return user's choice

  // For now, just return true (auto-confirm)
  return true;
}
