# Preserve run outcomes in benchmark comparisons

## Context
The A/B harness stores each report exit code but compares only test and model counters. A suite hook or reporter can fail after matching passing test attempts, leaving the rendered comparison without the run outcome difference.

## Decision
Include the run exit code in the existing exact counter comparison. Stable equal values remain absent from the changed-counter table, while differing or unstable exit statuses remain visible.

## Alternatives
Treat a run failure as a synthetic test: rejected because it is not a test attempt. Ignore exit codes: rejected because passing attempts alone cannot establish a passing run.

## Consequences
The comparison data and Markdown counters expose exit-code differences and instability without changing test identity, timing estimates, or benchmark exit behavior.

## Validation
Two regression cases fail on upstream with the new tests: a stable failed candidate after matching passing attempts, and varying candidate exit statuses. After the fix, the Node script test suite passes. Exact command and logs are retained in the local campaign evidence. No browser or model calls are required for this script-only change.

## Documentation clarification
The contribution guide now states that exit-code differences or instability are reported. It does not promise a changed-counter row when both sides have the same stable failing exit code. This documentation-only correction preserves the implementation and regression assertions. Validated with `git diff --check` and inspection against the existing counter comparison behavior.
