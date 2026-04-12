# Fix Duplicate CI Check Runs

## Problem

Every PR triggered two identical CI workflow runs. The `ci.yaml` workflow had:

```yaml
on:
  push:
  pull_request:
    branches: [main]
```

The `push` trigger had no branch filter, so pushing to a PR branch fired both `push` (any branch) and `pull_request` (targeting main), resulting in two runs of the same `test` job.

## Solution

Added `branches: [main]` filter to the `push` trigger:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

This is the standard GitHub Actions pattern. Each event now produces exactly one CI run:
- **PR activity** → `pull_request` trigger (one run)
- **Push/merge to main** → `push` trigger (one run)

## Why keep `push` on main?

The `push` trigger on `main` catches post-merge breakage — e.g., two PRs that individually pass CI but conflict when both are merged. Without it, broken code on `main` would go undetected until the next PR.
