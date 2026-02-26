# Contributing to R&R System

Thank you for your interest in contributing to the Recipes & Receipts system!

## Development Setup

1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd rr-system
   npm install
   ```

2. **Build all packages**:
   ```bash
   npm run build
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

## Project Structure

```
rr-system/
├── packages/
│   ├── rr-store/       # Recipe storage and embeddings
│   ├── rr-discover/    # Semantic search
│   ├── rr-receipts/    # Receipt validation and aggregation
│   ├── rr-client/      # Agent SDK
│   └── rr-node/        # HTTP server and cluster config
├── spec/               # JSON schemas
├── examples/           # Example scripts
└── docs/               # Documentation
```

## Coding Guidelines

### TypeScript Style

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use async/await over promises
- Export types alongside implementations
- Use ESM imports (`.js` extensions in imports)

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Interfaces**: `PascalCase`

### Security Requirements

When working with receipts or cryptography:

1. **Never store user identity** in receipts
2. **Never include source code** in receipts
3. **Use @noble libraries** for all crypto operations
4. **Validate all inputs** before processing
5. **Check rate limits** for public endpoints

### Testing

Each package should have tests covering:
- Happy path scenarios
- Error cases
- Edge cases (empty inputs, large inputs, etc.)
- Security validations

## Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clean, documented code
   - Add tests for new functionality
   - Update relevant documentation

3. **Build and test**:
   ```bash
   npm run build
   npm test
   ```

4. **Commit with descriptive messages**:
   ```bash
   git commit -m "Add feature: semantic search pagination"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

## Adding New Features

### Adding a New Package

1. Create directory: `packages/your-package/`
2. Add `package.json` with workspace dependency
3. Add `tsconfig.json` extending root config
4. Create `src/` directory with implementation
5. Export public API from `src/index.ts`
6. Add to root workspace in `package.json`

### Adding New Endpoints

1. Add route handler in `packages/rr-node/src/routes.ts`
2. Update API documentation in README
3. Add tests for the endpoint
4. Update client SDK if needed

### Adding New Schemas

1. Add JSON schema to `spec/`
2. Update type definitions in relevant packages
3. Add validation logic
4. Update documentation

## Testing Strategy

### Unit Tests
Test individual functions and classes in isolation.

### Integration Tests
Test interactions between packages.

### End-to-End Tests
Test complete workflows (discover → fetch → submit receipt).

## Documentation

When adding features, update:

- `README.md` - User-facing documentation
- `ARCHITECTURE.md` - System design documentation
- Inline code comments for complex logic
- Package README if adding a new package

## Code Review

All contributions require code review. Reviewers will check:

- Code quality and style
- Test coverage
- Security considerations
- Documentation updates
- Breaking changes

## Release Process

1. Update version numbers in all `package.json` files
2. Update `CHANGELOG.md` with changes
3. Create git tag: `git tag v1.0.0`
4. Build and publish packages
5. Update documentation

## Questions?

- Open an issue for bugs or feature requests
- Tag with appropriate labels (bug, enhancement, question)
- Provide reproducible examples for bugs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
