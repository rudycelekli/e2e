# Backport the remaining download-budget assertion

## Context

The saved CI failure parses the message only when its remaining wait budget is
exactly 500ms. Setup can consume part of that budget, causing a valid 499ms
message to yield NaN. The affected PRs change report formatting, not download
waiting. Upstream already fixed this test in commit 503e2a9 (#934).

## Decision

Backport that exact single-file upstream change. Parse both numeric fields,
require a positive budget capped at 500ms, and retain the trigger minimum of 190ms.

## Alternatives

A broader regex without budget checks would weaken the assertion. Changing
production diagnostics would misrepresent elapsed setup time.

## Consequences

The test accepts actual remaining budgets while rejecting malformed or invalid
timing evidence. Production behavior remains unchanged.

## Validation

A deterministic 499ms message yields NaN with the old parser and passes the
candidate checks. Controls reject zero and 501ms budgets, a 189ms trigger, and a
malformed message. Separate exact-head integration checks are retained locally.
