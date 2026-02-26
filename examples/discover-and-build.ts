/**
 * Example: Discover recipes and use them to build code
 */

import { RRClient } from '@agent-cookbook/client';

async function main() {
  const client = new RRClient({
    baseUrl: 'http://localhost:3000',
  });

  console.log('=== R&R Discovery Example ===\n');

  // 1. Discover recipes by natural language
  console.log('1. Searching for "rate limiting for API"...');
  try {
    const results = await client.discover('rate limiting for API', 3);
    console.log(`Found ${results.length} recipes:\n`);

    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   Recipe ID: ${result.recipe_id}`);
      console.log(`   Score: ${result.score.toFixed(2)}`);
      if (result.grade_avg) {
        console.log(`   Grade: ${result.grade_avg.toFixed(2)} (${result.total_runs} runs)`);
      }
      console.log(`   Steps: ${result.step_count}`);
      console.log(`   Fetch: ${result.fetch_url}\n`);
    });

    if (results.length > 0) {
      // 2. Fetch the top recipe
      const topRecipe = results[0];
      console.log(`\n2. Fetching full recipe: ${topRecipe.title}...`);

      const recipe = await client.getRecipe(topRecipe.recipe_id);
      console.log(`\nRecipe: ${recipe.title}`);
      console.log(`Version: ${recipe.version}`);
      console.log(`Description: ${recipe.description}`);
      console.log(`Tags: ${recipe.tags.join(', ')}\n`);

      console.log('Steps:');
      recipe.steps.forEach(step => {
        console.log(`\n  Step ${step.index}: ${step.title}`);
        console.log(`  Inputs: ${step.inputs.join(', ')}`);
        console.log(`  Outputs: ${step.outputs.join(', ')}`);
        console.log(`  Spec:\n    ${step.spec.split('\n').join('\n    ')}`);
        if (step.receipt_summary) {
          console.log(
            `  Grade: ${step.receipt_summary.grade_avg.toFixed(2)} (${step.receipt_summary.total_runs} runs)`
          );
        }
      });

      // 3. Fetch a single step (for composability)
      console.log(`\n3. Fetching single step for reuse...`);
      const firstStep = recipe.steps[0];
      const stepDetail = await client.getStep(recipe.id, firstStep.step_id);
      console.log(`\nStep: ${stepDetail.title}`);
      console.log(`Spec: ${stepDetail.spec}`);
      console.log('\n✓ This step can be used independently in other recipes');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('\nMake sure the R&R server is running: npm start');
  }

  // 4. Search at step level
  console.log('\n\n4. Searching for individual steps: "validate JWT token"...');
  try {
    const stepResults = await client.discoverStep('validate JWT token', 3);
    console.log(`Found ${stepResults.length} matching steps:\n`);

    stepResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.step_title}`);
      console.log(`   From recipe: ${result.recipe_title}`);
      console.log(`   Score: ${result.score.toFixed(2)}`);
      console.log(`   Fetch: ${result.fetch_url}\n`);
    });
  } catch (error: any) {
    console.error('Step search error:', error.message);
  }

  // 5. Discover by tags
  console.log('\n5. Searching by tags: ["auth", "oauth"]...');
  try {
    const tagResults = await client.discoverByTags(['auth', 'oauth'], 5);
    console.log(`Found ${tagResults.length} recipes with these tags:\n`);

    tagResults.forEach((result, i) => {
      console.log(`${i + 1}. ${result.title}`);
      console.log(`   Recipe ID: ${result.recipe_id}`);
      console.log(`   Steps: ${result.step_count}\n`);
    });
  } catch (error: any) {
    console.error('Tag search error:', error.message);
  }

  console.log('\n=== Discovery Complete ===');
}

main();
