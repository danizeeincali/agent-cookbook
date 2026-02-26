/**
 * Example: Generate and submit a receipt after building from a recipe
 */

import { RRClient } from '@agent-cookbook/client';

async function main() {
  const client = new RRClient({
    baseUrl: 'http://localhost:3000',
  });

  console.log('=== R&R Receipt Generation Example ===\n');

  // 1. Generate ephemeral agent key for this session
  console.log('1. Generating ephemeral Ed25519 keypair for this agent session...');
  const agentKey = await client.generateAgentKey();
  console.log(`   Public key: ${agentKey.publicKey.substring(0, 16)}...`);
  console.log('   ✓ Private key stored in memory only (never persisted)\n');

  // 2. Discover and build from a recipe
  console.log('2. Discovering recipes for "rate limiting"...');
  try {
    const results = await client.discover('rate limiting', 1);

    if (results.length === 0) {
      console.log('   No recipes found. Submit one first using submit-recipe.ts');
      return;
    }

    const recipe = results[0];
    console.log(`   Found: ${recipe.title}`);
    console.log(`   Recipe ID: ${recipe.recipe_id}\n`);

    // 3. Simulate building code from the recipe
    console.log('3. Building implementation from recipe...');
    console.log('   [Agent implements the recipe steps]');
    console.log('   [Running tests...]');
    console.log('   [Security scan...]');
    console.log('   ✓ Build complete\n');

    // 4. Measure quality components
    console.log('4. Measuring quality components...');
    const gradeComponents = {
      correctness: 1.0, // All tests passed
      performance: 0.92, // Good performance metrics
      security_scan: 0.88, // Minor warnings
      test_coverage: 0.95, // 95% coverage
    };

    console.log('   Correctness: 100% (all tests passed)');
    console.log('   Performance: 92% (good response times)');
    console.log('   Security: 88% (minor warnings addressed)');
    console.log('   Test Coverage: 95%');

    // Calculate overall grade (weighted average)
    const grade =
      0.4 * gradeComponents.correctness +
      0.2 * gradeComponents.performance +
      0.2 * gradeComponents.security_scan +
      0.2 * gradeComponents.test_coverage;

    console.log(`   Overall grade: ${grade.toFixed(2)}\n`);

    // 5. Submit receipt
    console.log('5. Submitting receipt to R&R system...');
    try {
      await client.submitReceipt({
        targetId: recipe.recipe_id,
        targetType: 'recipe',
        gradeComponents,
        agentKeyPair: agentKey,
      });

      console.log('   ✓ Receipt submitted successfully');
      console.log('   ✓ Grade aggregated into recipe summary (EMA α=0.1)');
      console.log('   ✓ No user data or source code included in receipt\n');
    } catch (error: any) {
      console.error('   ✗ Receipt submission failed:', error.message);
      console.log('   Make sure the R&R server is running: npm start\n');
    }

    // 6. Example: Submit receipt for a single step
    console.log('6. Example: Submitting receipt for a single step...');
    const fullRecipe = await client.getRecipe(recipe.recipe_id);
    if (fullRecipe.steps.length > 0) {
      const firstStep = fullRecipe.steps[0];

      console.log(`   Step: ${firstStep.title}`);
      console.log(`   Step ID: ${firstStep.step_id}`);

      const stepGrade = {
        correctness: 1.0,
        test_coverage: 0.98,
      };

      try {
        await client.submitReceipt({
          targetId: firstStep.step_id,
          targetType: 'step',
          gradeComponents: stepGrade,
          agentKeyPair: agentKey,
        });

        console.log('   ✓ Step receipt submitted\n');
      } catch (error: any) {
        console.error('   ✗ Step receipt failed:', error.message, '\n');
      }
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  console.log('=== Receipt Generation Complete ===');
  console.log('\nKey takeaways:');
  console.log('- Receipts contain no user identity or source code');
  console.log('- Agent keys are ephemeral (generated per session)');
  console.log('- Grades aggregate using EMA (α=0.1) for stability');
  console.log('- Both full recipes and individual steps can receive receipts');
}

main();
