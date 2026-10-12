# Assert the remaining locator timeout budget

## Context

The failure-evidence integration tests assumed each locator receives the full
300ms action timeout. Deadline creation precedes locator resolution, so its first
engine call can receive 299ms. The runtime and failing test are identical on the
PR heads and upstream main; a controlled one-millisecond delay reproduces the
299ms report without an early return.

## Decision

Capture the first locate operation's remaining timeout and assert that reported
waiting covers that budget. Retain the 3000ms upper bound. Validate the assertion
with a 299ms budget, a too-early 298ms return, and a too-late 3000ms return.

## Alternatives

A fixed tolerance could hide an early return. Changing the runtime's accurate
elapsed-time report would obscure the evidence. Neither is required.

## Consequences

These tests reflect the actual deadline budget while retaining both timing
bounds. Production behavior remains unchanged.

## Validation

The frozen old assertion rejects the 299ms control. The revised assertion accepts
it and rejects both invalid controls. The complete failure-evidence integration
suite passes nine tests. The original suite passes eight tests locally, confirming
that the saved CI failure is intermittent rather than a deterministic PR regression.
