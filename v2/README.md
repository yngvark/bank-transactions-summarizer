# Bank Transactions Summarizer v2

A React-based frontend for summarizing bank transactions.

## Development

```bash
# Install dependencies
make install

# Run dev server (uses random port 3000-9000)
make dev

# Run on specific port
PORT=5173 make dev

# Build for production
make build
```

The dev server uses a random port by default to enable parallel development across multiple branches/worktrees.

## Testing

End-to-end tests are written with Playwright. See [TESTING.md](./TESTING.md) for detailed instructions on running tests locally.

**Quick start:**
```bash
# Install dependencies (one-time setup)
cd v2
npm install
npx playwright install --with-deps

# Run all tests
npm run test:e2e

# Run with UI (recommended for development)
npm run test:e2e:ui
```
