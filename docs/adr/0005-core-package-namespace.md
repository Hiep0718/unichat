# ADR-0005 — Core API Package Namespace

## Status
Accepted

## Context
The file-plan §5 specification currently dictates the base package as `com.unichat`. However, the implementation from the beginning has been using `com.unichat.core`. This affects over 55+ source files. Refactoring the entire codebase to match the specification would take considerable effort (~2h) and create a massive unvaluable diff, risking regressions.

## Decision
We will formally retain `com.unichat.core` as the base package namespace for the Core API module. 
The nesting pattern will follow: `com.unichat.core.{feature}.{layer}.{File}` (maximum 5 levels deep).

## Reason
- Prevents potential package conflicts if we introduce a shared module like `com.unichat.shared` or AI module `com.unichat.ai` in the future.
- The cost of refactoring is high while the risk of regression is not justified by any business value.
- The convention is already consistently applied across the entirety of the current Core API codebase.

## Consequences
- We will update file-plan §5 to reflect that the base package for Core API is `com.unichat.core`.
- The nesting limit rule for Core API is adjusted from 4 levels (below source root) to 5 levels to account for the extra `core` segment.
