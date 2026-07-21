# Senior Engineering Standards

These rules are mandatory for every human and AI contributor.

## Source of truth

- Read `docs/specifications/architecture-decision.md`, `docs/specifications/file-plan.md`, `docs/specifications/api-contracts.md`, `docs/specifications/data-model.md`, `docs/specifications/adaptive-retrieval-spec.md` and `docs/specifications/test-plan.md` before implementation.
- Product P0 is Adaptive Knowledge Retrieval & Reasoning inside an AI Knowledge Platform.
- Core API owns authorization. AI Service receives allowed document IDs and never becomes a second authorization authority.
- Record every autonomous decision in `.pipeline/decisions-log.md`.

## Code quality

- Apply SOLID and feature-based organization.
- Pure logic functions must not exceed 30 lines.
- React render functions should not exceed 60 JSX lines and must never exceed 100.
- Files must stay below 300 lines; config/schema/complex UI may reach 500.
- Document all public APIs with JSDoc, TSDoc or Javadoc.
- Use meaningful names, early returns and no more than three nesting levels.
- Prefer `const`; never use `var`.
- Keep TypeScript strict and Python mypy strict.
- No production `console.log`; use structured logging.

## Testing

- Untested code is unfinished.
- Core business logic requires at least 80% unit coverage.
- Add integration tests for every API endpoint and database interaction.
- Add Playwright E2E tests for every critical flow.
- Use Vitest, JUnit/Testcontainers, pytest and Playwright.
- Follow Arrange, Act, Assert and behavior-focused test names.
- Mock external dependencies; tests must never make real network calls.

## Security

- Validate every input with Zod, Jakarta Validation or Pydantic.
- Use framework escaping; never render untrusted raw HTML.
- Access JWT: RS256, 15 minutes. Refresh token: opaque, hashed, rotated and reuse-revoked.
- Verify authorization on every endpoint and again before persistence/return after AI calls.
- Use parameterized persistence only.
- Keep secrets in environment variables; never hardcode them.
- Pin dependencies and audit them regularly.
- Enforce HTTPS in deployed environments, CORS allowlists and CSP.
- Redact tokens, prompts, chunks and document contents from logs.

## Error handling

- Never swallow errors.
- Use typed errors and RFC 7807 at the Core API boundary.
- Include request ID, operation and timestamp in structured logs.
- Return friendly client messages while retaining details server-side.
- Maintain global exception handlers and a frontend error boundary.

## Performance and architecture

- Paginate list endpoints: default 20, maximum 100.
- Debounce user input at 300 ms and throttle scroll/resize at 100 ms when needed.
- Profile before memoization or caching.
- Keep processes stateless and configuration environment-driven.
- Use routes/controllers, services and repositories with focused interfaces.
- Keep AI Service, PostgreSQL, ChromaDB, RabbitMQ and Ollama private.
- Use RabbitMQ as the message broker for asynchronous tasks and document ingestion.

## Files and encoding

- Use kebab-case files/directories, PascalCase types/components and camelCase variables/functions.
- Maximum nesting is four levels below each source root unless the approved file plan requires otherwise.
- Import order: external, internal, relative, types.
- All generated files must be UTF-8 without BOM.
- Preserve full Vietnamese diacritics in user-facing content.

## Git and delivery gates

- Use Conventional Commits and one logical change per commit.
- Stop for explicit human approval before every commit, push or deployment.
- Never force-push protected branches.
- Do not install unapproved packages or mutate a database without authorization.
- Run compile, lint and tests before reporting completion.
- Never modify files outside this workspace.

## Documentation

- Update README, CHANGELOG, API examples, ADRs and runbooks when behavior changes.
- Create an ADR for significant architectural decisions.
- Keep evidence and checkpoint truthfully synchronized in `.pipeline`.
