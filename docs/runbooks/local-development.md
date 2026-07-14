# Local development runbook

## Preconditions

Use the approved portable runtimes under `.tools` or matching system installations. Copy `.env.example` to `.env` and provide local-only secrets.

## Startup order

1. PostgreSQL and ChromaDB.
2. AI Service on the private application network.
3. Core API.
4. Frontend.

## Verification

Run frontend lint/typecheck/test/build, Core API verify and AI Service ruff/mypy/pytest before integration. Never call Gemini or other external providers from automated tests.

## Troubleshooting

Use request IDs across services. Inspect structured logs without printing tokens, prompts, chunks or document contents. Do not weaken CORS, authorization or Evidence Gate to bypass local failures.