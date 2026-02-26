# Changelog

All notable changes to the R&R system will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-02-26

### Added

#### Core Packages
- `@rr-system/store` - Recipe storage with vector embeddings
  - Content-addressed recipe IDs using SHA-256
  - Vector embedding generation with AllMiniLM-L6-v2
  - Filesystem storage backend
  - Receipt summary management

- `@rr-system/discover` - Semantic search API
  - Natural language query support
  - Tag-based filtering
  - Step-level search
  - Hybrid ranking (0.7 × similarity + 0.3 × grade)

- `@rr-system/receipts` - Receipt validation and grade aggregation
  - Ed25519 signature verification using @noble/ed25519
  - Grade calculation from components
  - Exponential moving average (EMA) aggregation with α=0.1
  - Rate limiting (100 receipts/hour per agent)

- `@rr-system/client` - TypeScript SDK for AI agents
  - High-level discovery and consumption API
  - Receipt generation and submission
  - Ephemeral Ed25519 key management
  - Type-safe interfaces

- `@rr-system/node` - R&R node with HTTP server
  - RESTful HTTP API
  - Health check endpoint
  - Environment-based configuration
  - Cluster configuration support

#### Schemas
- Recipe JSON schema with validation
- Receipt JSON schema with validation
- Index entry JSON schema

#### Infrastructure
- Docker support with multi-stage builds
- Docker Compose configuration for 3-node cluster
- Cluster configuration with Raft support
- Environment variable configuration

#### Documentation
- Comprehensive README with quick start guide
- Architecture documentation
- API endpoint documentation
- Contributing guidelines
- Example scripts (submit-recipe, discover, generate-receipt)

#### Examples
- Recipe submission example
- Discovery and consumption example
- Receipt generation example

### Security
- Ed25519 signatures for receipt authenticity
- No user identity or source code in receipts
- Timestamp validation (5-minute window) for anti-replay
- Rate limiting per agent key
- Content-addressed storage for immutability

### Performance
- Vector embedding caching
- Cosine similarity optimization
- Hybrid ranking for relevant results
- Efficient filesystem storage

## [Unreleased]

### Planned Features
- IPFS integration for distributed storage
- Advanced search with faceted filtering
- Analytics and trend detection
- Federation support for cross-registry discovery
- Percentile tracking for grades (P10, P50, P90)
- Enhanced rate limiting with burst support
- Metrics and monitoring
- Admin API for cluster management
