# GitHub Copilot Instructions for Bank Transactions Summarizer

## Project Overview

**Bank Transactions Summarizer** is a frontend-only React application for analyzing and summarizing bank transactions. Users can upload Excel files containing transaction data, view statistics, and analyze spending patterns by category.

**Key Features:**
- Excel file upload and parsing (using SheetJS/xlsx)
- Two-level category system (main category → sub-category)
- Monthly spending statistics with visual color coding
- Search and filtering capabilities
- D3.js visualizations
- Fully client-side (no backend, no database)

**Live Demo:** https://yngvark.github.io/bank-transactions-summarizer/

## Tech Stack

### Frontend (v2)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Runtime**: Node.js 18+
- **Package Manager**: npm
- **Data Processing**: xlsx (SheetJS) for Excel parsing
- **Visualization**: D3.js v7
- **Linting**: ESLint with TypeScript

### Deployment
- **Platform**: GitHub Pages
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`)
- **Base Path**: `/bank-transactions-summarizer/` (configured via BASE_URL env var)

## Project Structure

```
bank-transactions-summarizer/
├── v2/
│   └── frontend/           # Current React + TypeScript app
│       ├── src/            # Source code
│       │   ├── components/ # React components
│       │   ├── services/   # Business logic, data processing
│       │   └── types/      # TypeScript type definitions
│       ├── public/         # Static assets
│       ├── package.json    # Dependencies and scripts
│       ├── vite.config.ts  # Vite configuration
│       └── tsconfig.json   # TypeScript configuration
├── .github/
│   ├── workflows/          # CI/CD workflows
│   └── copilot-instructions.md  # This file
├── .beads/
│   └── issues.jsonl        # Issue tracking (bd/beads)
├── Makefile               # Development commands
├── README.md              # User documentation
├── AGENTS.md              # AI agent workflows (bd/beads)
└── V2_ARCHITECTURE.md     # Architecture design doc
```

## Development Workflow

### Setup and Running

```bash
# Install dependencies
make install
# or: cd v2/frontend && npm install

# Start development server
make run
# or: cd v2/frontend && npm run dev

# Build for production
make build
# or: cd v2/frontend && npm run build

# Lint code
cd v2/frontend && npm run lint
```

### Port Configuration

The development server uses a random port (3000-9000) by default. Override with:
```bash
PORT=3000 make run
```

### Build Configuration

- Development builds: Standard Vite dev server
- Production builds: Base URL set to `/bank-transactions-summarizer/` via `BASE_URL` environment variable
- Output: `v2/frontend/dist/`

## Coding Guidelines

### TypeScript
- Use strict TypeScript mode
- Define interfaces for all data structures
- Avoid `any` type; use proper typing
- Export shared types from `types/` directory

### React
- Use functional components with hooks
- Keep components focused and single-purpose
- Use TypeScript for prop types
- Follow existing component patterns in `src/components/`

### Code Style
- Run `npm run lint` before committing
- Follow ESLint configuration (`.eslintrc.*` in frontend directory)
- Use consistent naming conventions
- Add comments for complex logic only

### File Organization
- Components: `src/components/`
- Business logic: `src/services/`
- Types: `src/types/`
- Assets: `public/`

## Issue Tracking with bd (beads)

**CRITICAL**: This project uses **bd** for ALL task tracking. Do NOT create markdown TODO lists.

### Essential Commands

```bash
# Find available work
bd ready --json

# View issue details
bd show <id> --json

# Claim work
bd update <id> --status in_progress --json

# Create new issues
bd create "Issue title" -t bug|feature|task -p 0-4 --json

# Complete work
bd close <id> --reason "Done" --json

# Sync with git (CRITICAL at end of session!)
bd sync
```

### Workflow

1. **Check ready work**: `bd ready --json`
2. **Claim task**: `bd update <id> --status in_progress`
3. **Implement**: Code, test, document
4. **Complete**: `bd close <id> --reason "Done" --json`
5. **Sync**: `bd sync` (commits and pushes changes)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

**See AGENTS.md for detailed workflows and bd usage.**

## Testing

Currently, there is no test infrastructure in place. When adding tests:
- Consider Vitest (Vite-native) or Jest
- Place test files adjacent to source: `Component.test.tsx`
- Follow React Testing Library patterns
- Test user interactions and business logic

## Key Documentation

- **README.md** - User-facing documentation, getting started
- **AGENTS.md** - AI agent workflows and bd (beads) usage
- **V2_ARCHITECTURE.md** - Architecture design and decisions
- **CLAUDE.md** - Additional guidelines for Claude AI

## Common Tasks

### Adding a New Feature
1. Create issue: `bd create "Feature name" -t feature -p 2 --json`
2. Claim it: `bd update <id> --status in_progress`
3. Implement in `v2/frontend/src/`
4. Test locally: `make run`
5. Lint: `cd v2/frontend && npm run lint`
6. Build: `make build`
7. Close issue: `bd close <id> --reason "Implemented"`
8. Sync: `bd sync`

### Fixing a Bug
1. Create or find issue: `bd create "Bug description" -t bug -p 1 --json`
2. Investigate and fix
3. Verify fix locally: `make run`
4. Close and sync

### Updating Dependencies
1. Update `package.json` in `v2/frontend/`
2. Run `npm install`
3. Test that build still works: `npm run build`
4. Update `package-lock.json` is committed

## Deployment

- **Trigger**: Push to `main` branch
- **Process**: GitHub Actions builds and deploys to GitHub Pages
- **Workflow**: `.github/workflows/deploy.yml`
- **URL**: https://yngvark.github.io/bank-transactions-summarizer/

Changes to `main` automatically deploy. Test locally before merging!

## Important Rules

### Do's ✅
- Use bd for ALL task tracking
- Always use `--json` flag for programmatic bd operations
- Run `bd sync` at end of work sessions
- Test locally with `make run` before committing
- Run linter before committing: `cd v2/frontend && npm run lint`
- Update documentation when changing behavior
- Commit `.beads/issues.jsonl` with code changes
- Use TypeScript strictly (no `any` types)

### Don'ts ❌
- Do NOT create markdown TODO lists
- Do NOT commit `node_modules/` or build artifacts
- Do NOT use JavaScript (use TypeScript)
- Do NOT skip linting
- Do NOT merge to main without testing
- Do NOT add backend code (this is frontend-only)

## Architecture Notes

This is V2 of the application, rewritten in React + TypeScript. Key architectural decisions:

1. **Frontend-only**: No backend, no database, all processing in browser
2. **Client-side Excel parsing**: Uses xlsx library
3. **Stateless**: No data persistence (users re-upload files each session)
4. **GitHub Pages deployment**: Static hosting, no server required
5. **Future enhancements**: See V2_ARCHITECTURE.md for planned features (AI categorization, data persistence, etc.)

---

**For detailed AI agent workflows and bd usage, see [AGENTS.md](../AGENTS.md)**
