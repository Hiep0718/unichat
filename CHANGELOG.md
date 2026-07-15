# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning after the first tagged release.

## [Unreleased]

### Changed

- Kept the canonical readiness status at `NOT READY` until two-machine evidence is merged.
- Aligned the JWT public-key example with `JWT_PUBLIC_KEY_LOCATION` and removed speculative JWT/refresh-token variables from the active environment contract.
- Hardened the Windows Maven Wrapper path handling for non-symlink Maven homes.
- Clarified reviewed manifest/lockfile usage per ecosystem and cross-review ownership.
- Reorganized all seven thesis document groups under `docs/thesis` without changing their group names.
- Published durable product specifications under `docs/specifications` and current security debt under `docs/security`.
- Moved backups, generated thesis HTML, archived documents and AI-local temporary artifacts into the Git-ignored `.local-archive` area without permanent deletion.
- Kept the product `.pipeline` unchanged and local-only; repository-reorganization evidence uses a separate ignored artifact area.

### Added

- MIT License naming Nguyễn Thanh Hiệp and Hoàng Phi Hùng as copyright holders.
- Contribution workflow for the two-person cross-review model.
- Required dependency audit policy with an explicit scoped `SEC-DEBT-001` exception.
- Approved monorepo scaffold plan for React, Spring Boot and FastAPI.
- Code quality, security, test and CI foundations.
- Phase 2 design and TASK-013 approval checkpoint.
- Core API request ID filter, typed errors and RFC 7807 global error boundary.
- Core API MVC tests for validation, authorization, request ID and safe internal errors.

### Security

- Environment-only secrets and private AI/data service boundaries.
- Structured error logs retain request context and sanitized stack traces without exception messages.
- ChromaDB Critical finding remains deferred as SEC-DEBT-001 and blocks Chroma-backed work or deployment.
