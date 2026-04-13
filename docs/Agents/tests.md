# Testing Guide

<!-- How to run and debug tests -->

# Testing Workflow and When to Ask for Tests

You are an expert Software Engineer and Test Engineer.  
Your job is to design, write, and improve tests for this codebase. Never run test commands automatically. Always respond with the exact test command and wait for me to execute it

The stack includes:

- PostgreSQL, Redis
- TypeScript, React, Next.js 
- Tailwind CSS, shadcn/ui, Framer Motion

Always choose test tools and patterns that fit this stack.

---

## 1. Testing Principles

- Tests must be reliable, deterministic, and fast enough to run often.
- Prefer many small, focused tests over a few giant ones.
- Tests should document behavior: someone should be able to infer intended behavior from the tests alone.
- For any non-trivial change, write or update tests in the same change/PR.
- Prioritize tests in this order:
  1. Critical business logic
  2. Public APIs and endpoints
  3. Complex components and hooks
  4. Regressions (fixed bugs)

---

## 2. Test Types and When to Use Them

### Unit Tests

- Scope: a single function, method, component, or hook.
- No real external resources (no real DB, network, or Redis).
- Use for:
  - Pure logic (validation, transformations, business rules)
  - Small React components with simple behavior
  - Utility functions and helpers

### Integration Tests

- Scope: multiple modules or layers working together.
- May use a test DB / test Redis or hit HTTP endpoints in a test environment.
- Use for:
  - Next.js endpoints that touch DB/Redis
  - Next.js pages that integrate with data fetching/auth
  - Backend flows that go through several layers

### Regression Tests

- Scope: any bug that was found and fixed.
- Always add at least one test that failed before the fix and passes after.
- Keep these tests small and clearly tied to the bug scenario.

---

3. Next.js + TypeScript Testing
Use Vitest for unit and integration tests, and Playwright for end-to-end flows.

Conventions
Put tests under tests/, mirroring app structure where practical, or colocate low-level unit tests near the files they cover if your repo prefers that pattern.

tests/api/users.test.ts

tests/api/auth.test.ts

tests/services/payments.test.ts

tests/actions/create-user.test.ts

Test Route Handlers (app/api/**/route.ts) as backend endpoints, especially when they expose public APIs, webhook handlers, or BFF-style server logic.

Test Server Actions separately when they contain mutation logic used only by your app, since Server Actions are often the better fit for internal mutations than Route Handlers.

Use fixtures, factories, or setup helpers for:

App/request context

Test database, either isolated per suite or reset between tests

Mocked Redis, queues, email providers, or third-party APIs

Recommended tools
Use Vitest as the main test runner for TypeScript-heavy projects, especially for unit and integration tests.

Use next-test-api-route-handler, direct handler invocation, or request mocks to test Route Handlers without spinning up the full app for every backend test.

Use MSW or equivalent request mocking for upstream dependencies so tests stay deterministic and fast.

Use Playwright for end-to-end flows like login, checkout, or multi-step forms, and run those against the production build, not next dev, to reduce flakiness.

Scope of testing
Unit tests: pure utilities, schema validation, permission helpers, formatters, mappers, and service-layer logic.

Integration tests: Route Handlers, Server Actions, database interactions, auth checks, and third-party integration boundaries with mocks.

E2E tests: full user journeys, redirect behavior, middleware behavior, and critical flows across browser + backend boundaries.

Example Tester Prompts
After implementing or changing a Route Handler:

Act as Tester and:

Propose a test plan for the Route Handlers in app/api/users/route.ts.

Generate Vitest tests for the handlers.

Cover happy path, validation errors, and unauthorized access.

Put tests in tests/api/users.test.ts and tell me the command to run them.

For a Server Action change:

Act as Tester.

Write tests for the Server Action in app/actions/create-user.ts.

Cover success, invalid input, and permission failure.

Mock database and external dependencies as needed.

Put tests in tests/actions/create-user.test.ts and tell me how to run them.

For a bug fix:

Act as Tester.

Write a regression test for the bug we just fixed in app/api/auth/route.ts.

The test must fail before the fix and pass after.

Add it under tests/api/auth.test.ts and tell me how to run it.

For an end-to-end flow:

Act as Tester.

Write a Playwright test for the login flow.

Cover successful login, invalid credentials, and redirect to dashboard.

Put it in tests/e2e/auth.spec.ts.

Assume tests should run against the production build and tell me the commands.

Practical notes
Prefer testing backend logic below the HTTP layer when possible, because that keeps tests faster and less brittle while still letting you add a smaller number of Route Handler integration tests above it.

Keep auth, validation, and database logic separated from handler glue code so you can test business logic directly and avoid over-reliance on full request/response tests.

For webhooks and external callbacks, explicitly test missing signatures, invalid payloads, and replay/idempotency cases, since those are common production failure and security paths in Next.js backends.
---

## 4. TypeScript + React + Next.js Testing

Use Jest or Vitest with React Testing Library for frontend tests.

### Conventions

- Store tests near code or under a central `__tests__/` folder.
- Test **behavior**, not implementation details:
  - Assert on text, roles, and visible behavior.
  - Avoid poking at private state or implementation details.
- For components using shadcn/ui, Tailwind, or Framer Motion:
  - Assert that the right things appear, disappear, or respond to interaction.
  - Do not over-test library internals.

### Example Tester Prompts

After creating or changing a page/component:

> Act as Tester and:
> - Generate tests for `app/dashboard/page.tsx` using React Testing Library.
> - Cover: initial render, loading state, error state, and clicking the primary action.
> - Put tests in `__tests__/app/dashboard/page.test.tsx`.
> - Tell me which command to run the tests.

For a Zustand store or custom hook:

> Act as Tester.
> - Write unit tests for `store/useAuthStore.ts` that cover login, logout, and restoring a user from storage.
> - Place them in `__tests__/store/useAuthStore.test.ts`.
> - Tell me how to run just this file and the whole suite.

---

## 5. Tailwind, shadcn/ui, and Framer Motion

You do not test Tailwind or animation libraries directly; you test their **effects**.

- Tailwind:
  - Only assert on classes when they directly control behavior (e.g., `hidden` vs `block`).
  - Otherwise, assert on layout/visibility outcomes and accessibility.
- shadcn/ui and Radix:
  - Assert on roles (dialog, button, listbox), labels, and interaction results (open/close, selection).
- Framer Motion:
  - Assert that elements appear/disappear or change state as expected.
  - Do not test animation curves or timing.

Example prompt:

> Act as Tester.
> - For `components/AnimatedModal.tsx`, write tests that:
>   - Verify the modal opens when the trigger is clicked.
>   - Verify it closes when overlay or close button is clicked.
>   - Verify focus returns to the trigger after closing.
> - Use React Testing Library and place tests under `__tests__/components/AnimatedModal.test.tsx`.

---

## 6. When Exactly to Ask for Tests

Use this as your default rule:

> After **any non-trivial change**, immediately ask the AI to act as Tester.

###