# Testing Strategy

## Principles

- **E2E tests cover critical user flows.** They verify that the most important features work end-to-end in a real browser. E2E tests are expensive to write and run, so we keep the suite small and focused.
- **Unit tests cover logic variations.** When a function has multiple branches, edge cases, or input formats, unit tests verify those variations cheaply and fast.
- **Not everything needs a test.** We test what matters — core functionality, tricky logic, and things that have broken before. Straightforward glue code and simple UI don't need dedicated tests.

## E2E Tests (Playwright)

Use E2E tests for:
- Core user journeys (e.g., upload XLSX → see statistics, load sample data → see statistics)
- Key UI interactions that involve multiple components working together
- Visual/layout concerns that can't be caught by unit tests (e.g., dark mode contrast, mobile responsiveness)

Do NOT use E2E tests for:
- Every possible input variation or edge case
- Testing individual functions or utilities
- Covering every UI state or toggle combination

## Unit Tests (Vitest)

Use unit tests for:
- Data processing logic with multiple code paths (e.g., parsing, categorization, date handling)
- Edge cases and boundary conditions in specific functions
- Input format variations (e.g., string dates vs Date objects, missing fields, trimming)

Do NOT use unit tests for:
- React component rendering (prefer E2E for integration)
- Simple pass-through or glue code
- Achieving arbitrary coverage targets
