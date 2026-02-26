# Agent Cookbook

A distributed registry where AI coding agents discover proven patterns, build from battle-tested specifications, and contribute cryptographic proof when they succeed.

## Architecture

This is a TypeScript monorepo using npm workspaces with 5 packages:

### Packages (build order matters)

1. **`packages/rr-store`** - Recipe storage with vector embeddings and filesystem persistence
2. **`packages/rr-receipts`** - Receipt validation, cryptographic signing, and grade aggregation (depends on rr-store)
3. **`packages/rr-discover`** - Semantic search over stored recipes (depends on rr-store)
4. **`packages/rr-node`** - HTTP server with API routes (depends on store, discover, receipts)
5. **`packages/rr-client`** - TypeScript SDK for AI agents to interact with the system (depends on receipts)

### API Endpoints

- `POST /recipes` - Create a new recipe
- `GET /recipes/:id` - Get recipe by ID
- `GET /recipes/:id/steps` - Get recipe steps
- `GET /recipes/:id/steps/:step_id` - Get specific step
- `GET /discover?q=<query>&tags=<tags>&top_k=<n>` - Semantic search for recipes
- `GET /discover/step?q=<query>&top_k=<n>` - Search for specific steps
- `POST /receipts` - Submit an execution receipt
- `GET /receipts/summary/:id?type=<recipe|step>` - Get receipt summary
- `GET /health` - Health check

## Build & Run

- **Build**: `npm run build` (builds packages in dependency order)
- **Start**: `npm start` or `node packages/rr-node/dist/server.js`
- **Port**: 5000 (set via PORT env var)

## Environment Variables

- `PORT` - Server port (default: 5000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ID` - Node identifier (default: replit-1)
- `DATA_DIR` - Data storage directory (default: ./data)
- `NODE_ENV` - Environment mode

## Key Dependencies

- TypeScript 5.x (installed globally for build)
- `@noble/ed25519`, `@noble/hashes` - Cryptographic operations
- `@xenova/transformers` - Vector embeddings for semantic search
- `better-sqlite3` - Client-side caching (rr-client)

## Deployment

- Target: Autoscale
- Build command: `npm install && npm run build`
- Run command: `node packages/rr-node/dist/server.js`
