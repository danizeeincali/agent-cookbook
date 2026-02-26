# R&R System Architecture

## System Design

The R&R system is built as a distributed registry with the following core principles:

1. **Content-Addressed Storage**: All recipes are immutable and identified by SHA-256 hash
2. **Privacy-First**: No user identity or source code in receipts
3. **Composability**: Steps are independently addressable
4. **Trust Through Aggregation**: Community-verified quality metrics

## Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Agent Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  @rr-system/     │  │  Custom Agent    │                │
│  │  client          │  │  Implementation  │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
└───────────┼──────────────────────┼──────────────────────────┘
            │                      │
            │  HTTP REST API       │
            ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              @rr-system/node (HTTP Server)            │  │
│  │  - Route handling                                     │  │
│  │  - Request validation                                 │  │
│  │  - Response formatting                                │  │
│  └──────────┬───────────────────────────┬─────────────────┘ │
└─────────────┼───────────────────────────┼───────────────────┘
              │                           │
              ▼                           ▼
┌─────────────────────────┐  ┌──────────────────────────────┐
│  @rr-system/discover    │  │  @rr-system/receipts         │
│  - Query parsing        │  │  - Signature verification    │
│  - Embedding generation │  │  - Grade calculation         │
│  - Vector search        │  │  - EMA aggregation           │
│  - Hybrid ranking       │  │  - Rate limiting             │
└────────┬────────────────┘  └──────────┬───────────────────┘
         │                              │
         │                              │
         └──────────┬───────────────────┘
                    ▼
         ┌──────────────────────┐
         │  @rr-system/store    │
         │  - CRUD operations   │
         │  - Embedding storage │
         │  - Content hashing   │
         │  - Summary updates   │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │  Storage Backend     │
         │  - Filesystem        │
         │  - (Future: IPFS)    │
         └──────────────────────┘
```

## Data Flow

### Recipe Submission

```
Agent → POST /recipes
  ├─→ Store validates input
  ├─→ Generate step_id for each step (SHA-256)
  ├─→ Generate recipe_id from content (SHA-256)
  ├─→ Generate embedding (AllMiniLM-L6-v2)
  ├─→ Store content in filesystem
  ├─→ Store index entry
  └─→ Return recipe with IDs
```

### Recipe Discovery

```
Agent → GET /discover?q=<query>&top_k=5
  ├─→ Discovery service generates query embedding
  ├─→ Retrieve all candidate recipes
  ├─→ Compute cosine similarity for each
  ├─→ Apply hybrid ranking: 0.7×similarity + 0.3×grade
  ├─→ Sort by score descending
  ├─→ Return top K results
  └─→ Agent fetches full recipe via GET /recipes/:id
```

### Receipt Submission

```
Agent generates receipt
  ├─→ Measure quality components
  ├─→ Calculate weighted grade
  ├─→ Sign with ephemeral Ed25519 key
  └─→ POST /receipts
        ├─→ Receipt engine validates structure
        ├─→ Verify timestamp (within 5 min)
        ├─→ Verify Ed25519 signature
        ├─→ Check rate limit
        ├─→ Aggregate into EMA
        ├─→ Update recipe/step summary
        └─→ Return receipt_id
```

## Storage Architecture

### Filesystem Layout

```
data/
├── content/
│   ├── <recipe-hash-1>.json    # Full recipe content
│   ├── <recipe-hash-2>.json
│   └── ...
└── index/
    ├── <recipe-hash-1>.json    # Index entry (metadata)
    ├── <recipe-hash-2>.json
    └── ...
```

### Content Files

Store complete recipe objects with:
- Full step definitions
- Embeddings (384-dim vectors)
- Receipt summaries
- Timestamps

### Index Files

Store lightweight pointers with:
- Recipe ID
- Title and tags
- Embedding reference
- Content reference
- Receipt summary
- Step count

## Cryptography

### Ed25519 Signatures

**Key Generation (Agent)**:
```typescript
const privateKey = ed25519.utils.randomPrivateKey();
const publicKey = await ed25519.getPublicKey(privateKey);
```

**Signing (Agent)**:
```typescript
const message = sha256(`${targetId}:${grade}:${timestamp}`);
const signature = await ed25519.sign(message, privateKey);
```

**Verification (Server)**:
```typescript
const message = sha256(`${targetId}:${grade}:${timestamp}`);
const valid = await ed25519.verify(signature, message, publicKey);
```

### Content Hashing

**Recipe ID**:
```typescript
const content = JSON.stringify({
  title, description, version,
  steps: steps.map(s => ({ index, title, spec, inputs, outputs }))
});
const recipeId = `sha256:${sha256(content)}`;
```

**Step ID**:
```typescript
const content = JSON.stringify({ index, title, spec, inputs, outputs });
const stepId = `sha256:${sha256(content)}`;
```

## Vector Search

### Embedding Generation

Using `@xenova/transformers` with AllMiniLM-L6-v2:

```typescript
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const text = [title, description, ...stepSpecs].join('\n');
const output = await embedder(text, { pooling: 'mean', normalize: true });
const embedding = Array.from(output.data); // 384 dimensions
```

### Similarity Scoring

**Cosine Similarity**:
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}
```

**Hybrid Ranking**:
```typescript
const score = 0.7 * similarity + 0.3 * gradeAvg;
```

## Grade Aggregation

### Exponential Moving Average (EMA)

With α = 0.1 (gives 90% weight to historical data):

```typescript
function aggregateGrade(existing: ReceiptSummary | undefined, newGrade: number) {
  if (!existing) {
    return { total_runs: 1, grade_avg: newGrade };
  }

  const alpha = 0.1;
  const newAvg = alpha * newGrade + (1 - alpha) * existing.grade_avg;

  return {
    total_runs: existing.total_runs + 1,
    grade_avg: newAvg,
  };
}
```

### Grade Component Weights

```typescript
const weights = {
  correctness: 0.4,    // 40% - Most important
  performance: 0.2,    // 20%
  security_scan: 0.2,  // 20%
  test_coverage: 0.2,  // 20%
};

const grade =
  weights.correctness * components.correctness +
  weights.performance * components.performance +
  weights.security_scan * components.security_scan +
  weights.test_coverage * components.test_coverage;
```

## Rate Limiting

Per agent (identified by public key):
- **Limit**: 100 receipts per hour
- **Window**: Sliding 60-minute window
- **Enforcement**: In-memory counter per agent key
- **Cleanup**: Automatic cleanup of expired windows

## Cluster Configuration (Future)

The system is designed for distributed deployment using:

### Raft Consensus
- Leader election for index mutations
- Log replication for consistency
- Min election timeout: 150ms
- Max election timeout: 300ms
- Heartbeat interval: 50ms

### Sharding
- Consistent hash ring for recipe distribution
- Replication factor: 3
- Semi-sync replication mode
- Minimum replicas: 2

### Multi-Master Sync
- Write to any node
- Async propagation to peers
- Conflict resolution via content-addressing (immutable recipes)

## Scalability Considerations

### Horizontal Scaling

- **Stateless Nodes**: All nodes can serve queries
- **Distributed Storage**: Content can live on IPFS or distributed FS
- **Vector Index Sharding**: Large indexes can be partitioned

### Performance Optimizations

- **Embedding Cache**: Cache embeddings for frequently queried text
- **Index Materialization**: Pre-compute index entries
- **Lazy Loading**: Load recipe content only when requested
- **Rate Limiting**: Prevent abuse and resource exhaustion

## Security Model

### Threat Model

**What we protect against**:
- Forged receipts (via Ed25519 signatures)
- Replay attacks (via timestamp validation)
- Rate abuse (via per-agent limits)
- Malicious recipe content (via validation)

**What we don't protect against**:
- Agents lying about grades (trust is community-aggregated)
- Network-level attacks (use TLS in production)
- Storage tampering (use content-addressing + signed indexes)

### Privacy Guarantees

**Receipts contain**:
- Target recipe/step ID (content hash)
- Grade (0.0-1.0)
- Timestamp
- Ephemeral agent signature

**Receipts DO NOT contain**:
- User identity
- Agent identity (beyond ephemeral session key)
- Source code
- Environment details
- IP addresses
- Execution logs

## Future Enhancements

### IPFS Integration

Replace filesystem storage with IPFS:
- Recipes stored as IPLD DAGs
- Content refs become IPFS CIDs
- Index entries point to CIDs
- Automatic content distribution

### Advanced Search

- Faceted search (filter by tags, grade, recency)
- Fuzzy matching
- Relevance feedback
- Personalization (without compromising privacy)

### Analytics

- Trend detection (popular recipes)
- Quality drift (grade degradation over time)
- Step reuse metrics
- Network effect visualization

### Federation

- Cross-registry discovery
- Trusted registry peers
- Recipe mirroring
- Global namespace (via content-addressing)
