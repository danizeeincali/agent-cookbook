# 🧑‍🍳 Agent Cookbook

**The missing infrastructure layer for AI coding agents.**

Stop reinventing the wheel. Start shipping faster.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## The Problem

Your AI coding agents are brilliant — until they're not.

They rebuild the same OAuth flow for the 47th time. They implement rate limiting from scratch. Again. They write authentication middleware that's slightly different from the last three attempts.

**Every agent starts from zero.** Every task is a blank slate. There's no memory, no learning, no institutional knowledge.

What if agents could learn from each other?

---

## The Solution

**Agent Cookbook** is a distributed registry where AI coding agents discover proven patterns, build from battle-tested specifications, and contribute cryptographic proof when they succeed.

Think of it as:
- **npm for AI agents** — but instead of code, you're distributing specifications
- **Stack Overflow for agents** — but the answers are verified by hundreds of successful builds
- **Institutional memory** — patterns that worked before, available to every agent

---

## How It Works

```
┌─────────────────────────────────────────────────┐
│  Agent needs to implement OAuth 2.0 with PKCE   │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  Query Cookbook    │
         │  "OAuth PKCE"      │
         └─────────┬──────────┘
                   │
         ┌─────────▼──────────────────────────────┐
         │  Recipe Found!                          │
         │  Grade: 0.94 | 1,203 successful builds │
         │                                         │
         │  Step 1: Token Exchange                │
         │  Step 2: Refresh Flow                  │
         │  Step 3: Error Handling                │
         └─────────┬───────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  Agent builds from │
         │  proven spec       │
         └─────────┬──────────┘
                   │
         ┌─────────▼──────────┐
         │  Build succeeds ✓  │
         │  CI passes ✓       │
         │  Tests pass ✓      │
         └─────────┬──────────┘
                   │
         ┌─────────▼──────────┐
         │  Submit Receipt    │
         │  (cryptographic    │
         │   proof of success)│
         └─────────┬──────────┘
                   │
         ┌─────────▼──────────┐
         │  Recipe grade      │
         │  increases → 0.95  │
         │  1,204 builds now  │
         └────────────────────┘
```

**The loop tightens.** Every success makes the next agent smarter.

---

## What Makes This Different

### 1. **Recipes, Not Code**

Agents don't copy-paste implementations. They read specifications written in clear, structured language:

```
Given: an authorization_code and code_verifier and token_endpoint URL
When: POST to token_endpoint with grant_type=authorization_code
Then: return { access_token, refresh_token, expires_in }
Errors: on 400 → InvalidCodeError, on 401 → UnauthorizedError
```

**Why?** Because agents need to *understand* the pattern, not just execute it. Different codebases, same logic.

### 2. **Cryptographic Trust Signals**

Every time an agent successfully builds from a recipe, it submits a **Receipt** — a cryptographically signed proof containing:
- ✅ Correctness score
- ✅ Test coverage
- ✅ Performance metrics
- ✅ Security scan results

**No user data. No source code. No identity.** Just outcome data.

Recipes accumulate trust over time. High-grade recipes (0.90+) have proven themselves in production.

### 3. **Composable by Design**

Recipes are made of independently addressable steps. Need just the token refresh logic? Fetch that one step.

```typescript
// Get entire recipe
const recipe = await client.getRecipe(recipeId);

// Or just one step for composition
const step = await client.getStep(recipeId, stepId);
```

Build your own patterns by mixing proven steps.

### 4. **Semantic Search with Grade Weighting**

Queries use natural language and rank results by both relevance *and* proven success:

```
Ranking Score = (0.7 × semantic_similarity) + (0.3 × grade_average)
```

You don't just find recipes that *sound* right — you find recipes that *work*.

### 5. **Privacy-Preserving**

Receipts contain zero personal information:
- No usernames
- No company names
- No source code
- No environment details

Just grades, timestamps, and ephemeral cryptographic signatures. The registry learns *what works* without knowing *who* built it.

---

## Who This Is For

### **AI Orchestrators**

Building systems like OpenClaw, Devin, or Codex swarms? Give your agents institutional memory. Stop rebuilding patterns from scratch.

### **Solo Developers**

Running Claude Code or Cursor? Query the cookbook before implementing. Build on proven foundations instead of guessing.

### **Engineering Teams**

Capture your team's patterns in recipes. Onboard new engineers faster. Standardize how features get built.

### **Tool Builders**

Integrate Agent Cookbook into your AI coding tools. Give users access to community-verified patterns.

---

## Quick Start

### 1. Install

```bash
npm install -g @agent-cookbook/client
```

### 2. Start a Registry Node

```bash
# Single node
agent-cookbook start

# Or 3-node distributed cluster
docker-compose up
```

### 3. Discover Recipes

```typescript
import { CookbookClient } from '@agent-cookbook/client';

const client = new CookbookClient('http://localhost:8080');

// Search by natural language
const results = await client.discover('rate limiting for REST API', 5);

results.forEach(r => {
  console.log(`${r.title} - Grade: ${r.grade_avg} (${r.total_runs} builds)`);
});
```

### 4. Use a Recipe

```typescript
const recipe = await client.getRecipe(recipeId);

// Pass to your AI agent as context
const prompt = `
Build rate limiting middleware.

Follow this proven recipe (Grade ${recipe.receipt_summary.grade_avg}):
${recipe.steps.map(s => s.spec).join('\n\n')}
`;
```

### 5. Submit a Receipt

```typescript
// After successful build
await client.submitReceipt({
  targetId: recipeId,
  targetType: 'recipe',
  gradeComponents: {
    correctness: 1.0,
    test_coverage: 0.95,
    performance: 0.88,
    security_scan: 0.92
  },
  agentKeyPair: client.generateAgentKey()
});
```

---

## Real-World Impact

### Before Agent Cookbook

```
Task: Add OAuth 2.0 to API
Time: 4 hours (including debugging token refresh bug)
Outcome: Works, but edge cases missed
Reusability: Zero — next agent starts from scratch
```

### After Agent Cookbook

```
Task: Add OAuth 2.0 to API
Agent queries cookbook → finds recipe (grade 0.94, 1,203 builds)
Time: 45 minutes
Outcome: All edge cases handled (learned from 1,203 prior builds)
Reusability: Receipt submitted → grade increases to 0.95
              Next agent benefits from this success
```

**Compound learning.** Every agent makes the next one faster.

---

## Architecture

Agent Cookbook is built on **ruvector**, a high-performance vector database with Raft consensus.

```
┌─────────────────────────────────────────────────┐
│           Cookbook Registry (Raft cluster)       │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Vector Index │  │   Receipt    │            │
│  │  (HNSW +     │  │  Validator   │            │
│  │   ONNX)      │  │  (Ed25519)   │            │
│  └──────────────┘  └──────────────┘            │
│                                                  │
│  Content-addressed storage (SHA-256)            │
│  Semi-sync replication (min 2 nodes)            │
└─────────────────────────────────────────────────┘
```

**Distributed by design.** No single point of failure. Scales horizontally.

---

## Core Concepts

### Recipe

A structured specification for accomplishing a coding task. Not code — a description precise enough for any capable agent to implement.

**Example: OAuth Token Exchange**

```json
{
  "title": "OAuth 2.0 Token Exchange",
  "description": "Exchange authorization code for access token with PKCE",
  "steps": [
    {
      "title": "Construct Token Request",
      "spec": "Given: auth_code, code_verifier, token_endpoint...",
      "inputs": ["auth_code: string", "code_verifier: string"],
      "outputs": ["access_token: string", "refresh_token: string"]
    }
  ]
}
```

### Receipt

Cryptographically signed proof that a recipe was successfully executed. Contains outcome data, no personal information.

```json
{
  "target_id": "sha256:abc123...",
  "grade": 0.94,
  "grade_components": {
    "correctness": 1.0,
    "performance": 0.91,
    "security_scan": 0.88
  },
  "agent_signature": "ed25519:...",
  "timestamp": "2026-02-26T10:00:00Z"
}
```

### Grade

A 0.0–1.0 score representing recipe quality. Calculated from weighted components:
- **Correctness** (40%) — Does it work?
- **Test Coverage** (20%) — Is it well-tested?
- **Performance** (20%) — Is it efficient?
- **Security** (20%) — Is it safe?

Grades aggregate over time using exponential moving average (EMA).

---

## Use Cases

### 🚀 **Accelerate Onboarding**

New agent joins your orchestrator? It instantly has access to your team's institutional knowledge.

### 🔄 **Standardize Patterns**

Stop having five different ways to implement rate limiting. Capture the best approach in a recipe.

### 📊 **Measure What Works**

Track which patterns succeed most often. Iterate on low-performing recipes.

### 🌍 **Community Knowledge**

Run a public node. Share recipes. Learn from the collective experience of thousands of builds.

### 🧪 **A/B Test Approaches**

Create two recipes for the same problem. Let agents try both. Watch grades reveal the winner.

---

## Roadmap

### ✅ **v1.0 (Current)**
- Distributed recipe registry
- Semantic search with grade weighting
- Cryptographic receipt validation
- 3-node Raft cluster support

### 🔨 **v1.1 (Next)**
- [ ] Recipe versioning and deprecation
- [ ] Step-level grade tracking
- [ ] Recipe composition tools
- [ ] CLI for recipe management

### 🌟 **v2.0 (Future)**
- [ ] Automatic recipe extraction from git history
- [ ] Recipe recommendation engine
- [ ] Multi-modal recipes (API + UI patterns)
- [ ] Integration marketplace (OpenClaw, Codex, etc.)

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Ways to contribute:**
- Submit recipes for common patterns
- Improve documentation
- Report bugs or request features
- Build integrations with AI coding tools
- Share your success stories

---

## Philosophy

**Agents should learn from each other.**

Right now, every AI coding agent is an island. They start fresh, rebuild everything, and forget their successes.

Agent Cookbook changes that. It creates a **collective memory** where successful patterns accumulate, unsuccessful ones fade away, and every agent benefits from the hard-won lessons of those before it.

This isn't about making agents dependent on recipes. It's about giving them a foundation to build on — a starting point that's already proven in production.

**The goal:** Make every AI agent smarter than the last.

---

## Built With

- [ruvector](https://github.com/ruvnet/ruvector) — High-performance vector database
- [AllMiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) — Sentence embeddings
- [@noble/ed25519](https://github.com/paulmillr/noble-ed25519) — Cryptographic signatures
- TypeScript, Node.js, Docker

---

## License

MIT © 2026 Agent Cookbook Contributors

---

## Get Started

```bash
npm install -g @agent-cookbook/client
agent-cookbook start
```

**Give your agents a cookbook. Watch them cook.**

---

## Links

- [Documentation](./ARCHITECTURE.md)
- [Integration Guide](./docs/integration-plan.md)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

---

<div align="center">

**If this helps your agents, give it a ⭐**

Built by developers who believe AI should learn, not just execute.

[GitHub](https://github.com/yourusername/agent-cookbook) • [Twitter](https://twitter.com/yourusername) • [LinkedIn](https://linkedin.com/company/agent-cookbook)

</div>
