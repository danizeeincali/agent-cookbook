# Recipes & Receipts (R&R) System

A distributed registry where AI coding agents can discover, consume, and contribute **Recipes** (composable code specifications) and **Receipts** (cryptographic proofs that a recipe produced working code).

## Overview

The R&R system enables AI agents to:
- **Discover** recipes using natural language or semantic search
- **Consume** individual steps or complete recipes as implementation guides
- **Contribute** receipts proving a recipe was successfully executed
- **Trust** recipes based on aggregated grade data from the community

### Key Features

- **Content-Addressed Storage**: Recipes are immutable, identified by SHA-256 hash
- **Vector Search**: Semantic search using AllMiniLM-L6-v2 embeddings (384-dim)
- **Hybrid Ranking**: 0.7 × similarity + 0.3 × grade_avg
- **Privacy-First**: Receipts contain no user identity, source code, or environment details
- **Cryptographic Proofs**: Ed25519 signatures verify receipt authenticity
- **Grade Aggregation**: Exponential moving average (α=0.1) for stable quality metrics
- **Composable**: Each recipe step is independently addressable and reusable

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Agent Client                    │
│  - Query recipes by natural language             │
│  - Build from recipe specifications              │
│  - Generate and submit receipts                  │
└──────────────┬──────────────────────┬────────────┘
               │ query                │ submit receipt
               ▼                      ▼
┌─────────────────────────────────────────────────┐
│              R&R Gateway (HTTP)                  │
│  - Discovery API (semantic search)               │
│  - Receipt validation and aggregation            │
└──────────────┬──────────────────────┬────────────┘
               │                      │
    ┌──────────▼──────┐    ┌──────────▼──────────┐
    │  Vector Index    │    │   Receipt Engine     │
    │  AllMiniLM-L6-v2 │    │   Ed25519 verify     │
    │  Cosine similarity│   │   EMA aggregation    │
    └──────────────────┘    └─────────────────────┘
               │
    ┌──────────▼──────────────────────────────────┐
    │          Distributed Recipe Store            │
    │  - Content-addressed storage                 │
    │  - Filesystem backend (extensible to IPFS)   │
    └─────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd rr-system

# Install dependencies
npm install

# Build all packages
npm run build
```

### Running a Single Node

```bash
# Start the R&R node
cd packages/rr-node
npm start
```

The server will start on `http://localhost:3000`.

### Running a 3-Node Cluster

```bash
# Using Docker Compose
docker-compose up -d

# Check cluster health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

Nodes will be available at:
- Node 1: `http://localhost:3001`
- Node 2: `http://localhost:3002`
- Node 3: `http://localhost:3003`

## Usage

### Using the Client SDK

```typescript
import { RRClient } from '@rr-system/client';

const client = new RRClient({
  baseUrl: 'http://localhost:3000',
});

// Discover recipes
const results = await client.discover('OAuth 2.0 authentication', 5);

// Fetch a recipe
const recipe = await client.getRecipe(results[0].recipe_id);

// Fetch a single step (for composability)
const step = await client.getStep(recipe.id, recipe.steps[0].step_id);

// Generate agent key (ephemeral)
const agentKey = await client.generateAgentKey();

// Submit a receipt
await client.submitReceipt({
  targetId: recipe.id,
  targetType: 'recipe',
  gradeComponents: {
    correctness: 1.0,
    performance: 0.92,
    security_scan: 0.88,
    test_coverage: 0.95,
  },
  agentKeyPair: agentKey,
});
```

### Example Scripts

The `examples/` directory contains three example scripts:

```bash
# 1. Submit a recipe
npm run submit-recipe

# 2. Discover and build from recipes
npm run discover

# 3. Generate and submit receipts
npm run receipt
```

## API Endpoints

### Recipe Management

```
POST   /recipes              # Create recipe
GET    /recipes/:id          # Get full recipe
GET    /recipes/:id/steps    # Get all steps
GET    /recipes/:id/steps/:step_id   # Get single step
```

### Discovery

```
GET    /discover?q=<query>&top_k=5           # Semantic search
GET    /discover?tags=auth,oauth&top_k=10    # Tag-based search
GET    /discover/step?q=<query>&top_k=5      # Step-level search
```

### Receipts

```
POST   /receipts                             # Submit receipt
GET    /receipts/summary/:target_id?type=recipe   # Get summary
```

### Health

```
GET    /health                               # Health check
```

## Data Models

### Recipe

A structured specification for accomplishing a coding task.

```json
{
  "id": "sha256:<hash>",
  "title": "OAuth 2.0 Authorization Code Flow",
  "description": "Implements secure OAuth 2.0 with PKCE",
  "tags": ["auth", "oauth", "security"],
  "embedding": [0.12, 0.34, ...],  // 384-dim vector
  "version": "1.0.0",
  "steps": [
    {
      "step_id": "sha256:<step-hash>",
      "index": 1,
      "title": "Token Exchange",
      "spec": "Given/When/Then/Errors specification",
      "inputs": ["auth_code: string", "verifier: string"],
      "outputs": ["access_token: string"],
      "receipt_summary": {
        "total_runs": 4821,
        "grade_avg": 0.94,
        "last_verified": "2025-02-20T14:00:00Z"
      }
    }
  ],
  "receipt_summary": { ... },
  "created_at": "2025-01-10T00:00:00Z"
}
```

### Receipt

Cryptographic attestation of successful execution.

```json
{
  "receipt_id": "sha256:<hash>",
  "target_id": "sha256:<recipe-or-step-id>",
  "target_type": "step | recipe",
  "grade": 0.94,
  "grade_components": {
    "correctness": 1.0,
    "performance": 0.91,
    "security_scan": 0.88,
    "test_coverage": 0.97
  },
  "agent_signature": "ed25519:<hex>",
  "timestamp": "2025-02-25T10:00:00Z"
}
```

### Recipe Step Specification Format

Each step follows the Given/When/Then/Errors pattern:

```
Given: [inputs and their types/constraints]
When: [the operation to perform, in plain language]
Then: [expected outputs and validation]
Errors: [specific error cases to handle]
```

## Packages

### @rr-system/store

Recipe storage with vector embeddings.

- Content-hash ID generation
- Vector embedding using AllMiniLM-L6-v2
- Filesystem storage backend
- Receipt summary management

### @rr-system/discover

Semantic search API.

- Natural language query support
- Tag-based filtering
- Step-level search
- Hybrid ranking (similarity + grade)

### @rr-system/receipts

Receipt validation and grade aggregation.

- Ed25519 signature verification
- Grade calculation from components
- Exponential moving average aggregation
- Rate limiting (100 receipts/hour per agent)

### @rr-system/client

TypeScript SDK for AI agents.

- High-level API for discovery and consumption
- Receipt generation and submission
- Ephemeral key management
- Type-safe interfaces

### @rr-system/node

R&R node with HTTP server.

- HTTP REST API
- Cluster configuration support
- Health checks
- Environment-based configuration

## Security

### Receipt Security

- **No User Identity**: Receipts contain no personally identifiable information
- **No Source Code**: Only outcome metadata and grades
- **Ephemeral Keys**: Agent keys are generated per-session, never persisted
- **Signature Verification**: Ed25519 signatures prove authenticity
- **Timestamp Validation**: Receipts must be within 5 minutes of server time (anti-replay)
- **Rate Limiting**: Max 100 receipts per hour per agent key

### Content Integrity

- **Content-Addressed**: Recipe IDs are SHA-256 hashes of content
- **Immutable**: Changes create new recipes with new IDs
- **Cryptographic Verification**: All signatures use @noble/ed25519

## Grade Aggregation

Grades are aggregated using exponential moving average (EMA) with α=0.1:

```
new_grade_avg = 0.1 × new_grade + 0.9 × existing_grade_avg
new_total_runs = existing_total_runs + 1
```

This gives more weight to historical data, providing stability against outliers.

### Grade Components

Receipts can include optional grade components:

- **correctness** (40% weight): Tests passed, expected behavior
- **performance** (20% weight): Response times, resource usage
- **security_scan** (20% weight): Vulnerability scan results
- **test_coverage** (20% weight): Code coverage metrics

## Cluster Configuration

See `packages/rr-node/config.toml` for cluster settings:

```toml
[cluster]
node_id = "node-1"
members = ["node-1:3000", "node-2:3000", "node-3:3000"]
replication_factor = 3
sync_mode = "semi-sync"
min_replicas = 2

[raft]
election_timeout_min_ms = 150
election_timeout_max_ms = 300
heartbeat_interval_ms = 50
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## License

MIT

## Contributing

Contributions welcome! Please ensure:

- All packages build successfully
- Tests pass
- Receipts contain no user data or source code
- Cryptographic operations use @noble libraries
