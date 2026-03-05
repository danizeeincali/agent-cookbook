# Agent Cookbook

A distributed registry where AI coding agents discover proven patterns, build from battle-tested specifications, and contribute cryptographic proof when they succeed.

## Architecture

This is a TypeScript monorepo using npm workspaces with 5 packages:

### Packages (build order matters)

1. **`packages/rr-store`** - Recipe storage with vector embeddings, filesystem and PostgreSQL backends
2. **`packages/rr-receipts`** - Receipt validation, cryptographic signing, and grade aggregation (depends on rr-store)
3. **`packages/rr-discover`** - Semantic search over stored recipes (depends on rr-store)
4. **`packages/rr-node`** - HTTP server with API routes and landing page (depends on store, discover, receipts)
5. **`packages/rr-client`** - TypeScript SDK for AI agents to interact with the system (depends on receipts)

### Features

- Content-addressed recipes with SHA-256 hashing
- Semantic search via vector embeddings
- Cryptographic build receipts (Ed25519)
- Recipe forking with 50% grade inheritance and fork count tracking
- PostgreSQL persistent storage with filesystem fallback
- Landing page with live stats, charts, and latest recipe display

### Storage

- **PostgresStorage** (`packages/rr-store/src/pg-storage.ts`) - Production storage using PostgreSQL via `pg` library. Used when `DATABASE_URL` env var is set.
- **FilesystemStorage** (`packages/rr-store/src/storage.ts`) - Fallback storage using JSON files on disk. Used when no `DATABASE_URL` is available.
- Both implement the `RecipeStorageBackend` interface from `packages/rr-store/src/types.ts`

### Database Schema

PostgreSQL tables:
- `recipes` - `id TEXT PK`, `data JSONB`, `created_at TIMESTAMPTZ`
- `recipe_index` - `recipe_id TEXT PK`, `data JSONB`, `updated_at TIMESTAMPTZ`

### Landing Page

Static HTML/CSS/JS landing page served from `packages/rr-node/src/public/`:
- `index.html` - Main landing page with hero, charts, API docs, GitHub link
- `styles.css` - Dark theme styles
- `app.js` - Chart.js charts fetching from `/api/stats`

Files are copied to `dist/public/` during build.

### API Endpoints

- `GET /` - Landing page (HTML)
- `GET /api/stats` - Recipe/receipt statistics for charts
- `POST /recipes` - Create a new recipe
- `GET /recipes/:id` - Get recipe by ID
- `GET /recipes/:id/steps` - Get recipe steps
- `GET /recipes/:id/steps/:step_id` - Get specific step
- `GET /recipes/:id/forks` - List forks of a recipe
- `GET /api/latest` - Most recently added recipe (with step preview)
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

- `DATABASE_URL` - PostgreSQL connection string (uses PG when set, filesystem when not)
- `PORT` - Server port (default: 5000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ID` - Node identifier (default: replit-1)
- `DATA_DIR` - Data storage directory for filesystem fallback (default: ./data)
- `NODE_ENV` - Environment mode

## Key Dependencies

- TypeScript 5.x (installed globally for build)
- `pg` - PostgreSQL client for persistent storage
- `@noble/ed25519`, `@noble/hashes` - Cryptographic operations
- `@xenova/transformers` - Vector embeddings for semantic search
- `better-sqlite3` - Client-side caching (rr-client)

## Deployment

- Target: Autoscale
- Build command: `npm install && npm run build`
- Run command: `node packages/rr-node/dist/server.js`
- Database: Replit PostgreSQL (DATABASE_URL auto-provided in production)
