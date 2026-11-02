# Retrieval improvement plan — review handoff

**Updated:** 2026-10-24
**Purpose:** Give an independent reviewer a concise, complete account of the retrieval-improvement planning work, its current approval boundary, evidence, and open review items.

## 1. Why this work exists

The product concerns raised were:

1. AI answers can be overly cautious or refuse questions even when a useful answer may be possible.
2. Follow-up questions are not handled flexibly because contextual retrieval depends on a bounded set of lexical cues.
3. A Vietnamese question may need to retrieve an English definition (and vice versa).
4. The full application path must work—not only retrieval code—including ingestion, authorization, provider calls, persistence, and frontend delivery.
5. PDFs may contain scanned text, slides, images, and diagrams. OCR/diagram processing was explicitly kept deferred in the approved scope.

The plan is intended to diagnose these behaviors with evidence before changing retrieval, Evidence Gate thresholds, prompts, or models. It does not promise that any individual model or retrieval change will improve quality.

## 2. Work covered by this handoff

This handoff covers the planning, feasibility, and review work in this workstream. Source implementation and runtime configuration were inspected read-only where needed for feasibility/review, but not modified. No database, vector index, service, provider, or corpus was accessed or changed.

### Plan artifacts updated

All paths in this subsection are under `.pipeline/retrieval-optimization/improvement-plan/`:

| Artifact | What it contains / changed for this work |
|---|---|
| `requirements.md` | Records the approved design/evaluation-preparation scope, canonical-evaluator requirement, separate evaluator/production approval gates, and distinct current-stack versus post-implementation E2E evidence. |
| `task-breakdown.md` | Orders design, evaluator approval, canonical harness implementation, data/baseline work, production approval, implementation, and post-implementation E2E acceptance explicitly. |
| `file-plan.md` | Extends the existing evaluator modules and benchmark entrypoint instead of creating a parallel stack; proposed tests remain under configured pytest roots. |
| `architecture-decision.md` | Defines canonical evaluator ownership, the cluster-aware evaluation protocol, approval ordering, and separate readiness/E2E gates. |
| `questions.md` | Records the canonical evaluator, protocol supersession, approval boundaries, and still-unapproved live checks. |
| `review-report.md` | Retains review history and records the correction response as `PENDING_RE_REVIEW`; it does not self-approve the plan. |
| `feasibility-assessment.md` | Separates currently approved design preparation, evaluator implementation after approval, current-stack readiness, and post-implementation E2E evidence. |

### Project logs updated

- `.pipeline/decisions-log.md` records the plan corrections, operational feasibility decisions, and latest review blocker.
- `.pipeline/activity-log.md` records the assessment and review actions.
- `.pipeline/pipeline-state.json` was intentionally left unchanged because it belongs to a separate pipeline work item.

### Existing work not performed or re-reviewed here

Earlier project work already present in the workspace includes text chunking, contextual-query, vector-store, and chat-related code changes. Those were not made or reviewed as part of this handoff. Do not attribute them to this planning/review work; review their own diffs and evidence separately if they are in scope.

## 3. Decisions and approval boundaries

- The user approved the improvement scope for **detailed design/evaluation preparation only**.
- There is **no authorized evaluation corpus or gold question set** at present. Synthetic fixtures can test evaluator mechanics but cannot establish real retrieval or answer quality.
- Implementation, corpus acquisition or processing, provider calls, package/model downloads, production data access, threshold changes, re-ingestion, deployment, commits, and pushes require separate approval as applicable.
- OCR, scanned-PDF extraction, and diagram understanding remain deferred.
- Core API remains the sole authorization authority. Query variants must preserve the exact Core-provided document/workspace allowlist; Core revalidates sources before persistence/return.
- No real provider, database, Chroma instance, RabbitMQ broker, storage bucket, `.env`, or production service was contacted. Actual runtime state is unknown.

## 4. Feasibility conclusion and evidence

**Conclusion: conditionally feasible, but not currently proven empirically or operationally.**

- An offline evaluator and deterministic synthetic tests can be prepared, subject to explicit implementation approval. They only establish harness/code-path behavior.
- Follow-up and cross-language improvements cannot be demonstrated until an authorized, labeled corpus and cases exist.
- Reduced refusal rate is not, by itself, a success measure. The evaluation must identify whether a failure is in intent/clarification, retrieval, Evidence Gate, provider generation, citation/output validation, or Core persistence/validation.
- The current AI readiness endpoint checks Chroma client creation and provider configuration; it does not prove embedding weights are available, provider credentials work, the RabbitMQ consumer is running, or indexing succeeds.
- Embedding model loading is lazy. RabbitMQ consumer startup failure is logged while the AI app may continue running. Failed ingestion messages are rejected without requeue; the inspected ingestion queue has no explicit dead-letter arguments, although a DLQ queue is declared elsewhere. Actual broker policy and recovery behavior are unverified.
- Text extraction currently does not provide OCR/diagram understanding. The deferred multimodal requirement will not be met by executing this plan.
- These observations are code/config/runbook findings, not proof that a live environment is broken.

The feasibility report contains the detailed service flow, expected outcomes, evidence tiers, and caveats: `.pipeline/retrieval-optimization/improvement-plan/feasibility-assessment.md`.

## 5. Current correction and review status

The first review found three issues:

1. Proposed tests were outside pytest discovery roots.
2. Approval state conflicted across plan files.
3. Statistical and human-rating methodology was underspecified.

The plan first corrected test discovery, approval wording, and the missing statistical/human-rating protocol. A focused re-review then found that the implementation sequence still crossed the approval boundary:

> `file-plan.md` step 1 says to “Implement dataset schema and pure metrics using synthetic tests only,” but implementation is not approved. This conflicts with the design/evaluation-preparation-only approval boundary.

The subsequent session review expanded this into five findings: approval ordering across multiple artifacts, a duplicate/unwired evaluator design, conflict with source-of-truth evaluation specifications, absence of a post-implementation E2E gate, and weak auditability for Git-ignored artifacts.

The user authorized corrections. The plan now:

1. places explicit evaluator and production implementation approval gates before their respective code changes;
2. extends the existing `app/evaluation` modules and `benchmark_suite.py` instead of introducing a parallel evaluator;
3. synchronizes ADR-023 and `docs/specifications/test-plan.md` with the cluster-aware 10,000-resample/Krippendorff protocol;
4. separates current-stack readiness from post-implementation ingestion-to-answer E2E acceptance; and
5. records hashes for the ignored planning artifacts.

**Current status:** `PENDING_RE_REVIEW`. The prior `CHANGES_REQUIRED` verdict remains part of review history, but its findings have been addressed. No implementation, corpus processing, live checks, or delivery action is authorized by these documentation corrections.

Other relevant evidence:

- AI Service pytest roots are `app/tests` and `app/core/rag/tests` in `ai-service/pyproject.toml`.
- The file plan’s proposed test paths are under `app/tests`; its collection command should be checked from the `ai-service` working directory.
- No code tests, live smoke tests, or runtime checks were run in this plan-only work.

## 6. Suggested checklist for the next reviewer

Review the corrected artifacts together, rather than approving `file-plan.md` in isolation:

1. **Approval ordering:** verify that design-only work stops before evaluator approval and that production changes stop before the later production approval.
2. **Canonical evaluator:** verify that `dataset.py` plus the existing metrics/runner/report/storage/benchmark entrypoint form one authoritative path and that the draft/simulated path cannot emit a product-quality report.
3. **Protocol consistency:** confirm ADR-023, the project test plan, scoped ADR, dataset contract, and report contract use the same cluster/bootstrap/rating rules.
4. **Sequence/dependency consistency:** confirm data, baseline, development candidates, threshold freeze, holdout, production approval, implementation, and post-implementation E2E are ordered consistently.
5. **Pytest collection and entrypoint integration:** distinguish path discoverability from actually collecting/running the future tests; require an integration test for the normal benchmark entrypoint.
6. **Operational claims:** keep current-stack readiness separate from candidate acceptance; require actual embedding load, provider authentication when approved, persistent Chroma, signed Core→AI, source validation, durable completion/replay, frontend completion, and RabbitMQ/storage recovery.
7. **Queue recovery:** inspect broker topology/policies before concluding whether `nack(requeue=False)` drops, retries, or dead-letters a message.
8. **Authorization/privacy and deferred scope:** preserve the exact Core allowlist and source validation; keep OCR/diagram work deferred and raw prompts/chunks/documents out of operational logs.

## 7. Validation performed for this handoff

- Read the plan, feasibility report, and review record.
- Confirmed the plan’s pytest test paths against the configured discovery roots.
- Confirmed `.pipeline/` is Git-ignored. This handoff can identify the exact current-workspace artifacts through the hash manifest below, but it is not content-portable by itself; an external reviewer still needs the corresponding artifact files or a tracked snapshot.
- No tests or live services were run. This is a documentation handoff, not evidence of runtime readiness.

## 8. Scoped artifact hash manifest

The SHA-256 values below lock the exact corrected artifacts reviewed in this workspace. They must be regenerated whenever any scoped artifact changes.

<!-- HASH_MANIFEST_START -->
| Artifact | SHA-256 |
|---|---|
| `.pipeline/retrieval-optimization/improvement-plan/requirements.md` | `1df07128e0d41719c1d16eacd65a66ccb466276b1fb0269f3db026dcee23bd77` |
| `.pipeline/retrieval-optimization/improvement-plan/task-breakdown.md` | `7cd28c192edb1fd5f92ab6359d3ed85117309b71526c4c32c190708441ff8bc1` |
| `.pipeline/retrieval-optimization/improvement-plan/file-plan.md` | `672145aa5184c1861514c9ffc61a3d83bff473902fdc3a6e70c46fe9c3e9594b` |
| `.pipeline/retrieval-optimization/improvement-plan/architecture-decision.md` | `da0c53dba1e549b4e76c887116ab6483ca600a964d0d14fdf5b5d7444a8f40a7` |
| `.pipeline/retrieval-optimization/improvement-plan/questions.md` | `a8dc16c942034f2006bd29f2bebad3e2780d8a80ed5b2696f938503f3597eaae` |
| `.pipeline/retrieval-optimization/improvement-plan/review-report.md` | `111d5fe0e6b76f4a8d2d4faf628f1af59e893f8556bd2650023ed412a75fa90e` |
| `.pipeline/retrieval-optimization/improvement-plan/feasibility-assessment.md` | `46df30fab3bf518b00fdf8ae6d078436f566fc7b5437e34d6a9c86c833e2d26b` |
| `.pipeline/retrieval-optimization/improvement-plan/correction-summary.md` | `738e3b3ce0541ebc1cbadef5036e71150cb283a910915dab6bb8d977cb5bff54` |
| `docs/specifications/architecture-decision.md` | `326d2ba4508bbd63c20de944816014dc8cbd64e1d2dc36f80b24a0c6ad6ad6d8` |
| `docs/specifications/test-plan.md` | `3c2e86b455c2282cc756ae8d38b41984191d5bd49af840b17a74d92ca63d840a` |
<!-- HASH_MANIFEST_END -->
