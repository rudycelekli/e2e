# Report instability independently for both benchmark builds

## Context
The paired benchmark promises to report step-sequence variation within either build. Its exclusive condition reports baseline variation and suppresses candidate variation when both builds vary. The output then conceals one side of the evidence.

## Decision
For an unstable case, evaluate and append each side independently. Keep added/removed case handling and comparable-case exclusion unchanged.

## Alternatives
Report only the baseline: rejected because it omits observed candidate variation. Add a new combined change kind: rejected because two existing unstable entries already express the evidence and render correctly.

## Consequences
A case unstable on both sides has two entries. Both still refer to one excluded case; timing rows and comparable-case counts retain their meaning.

## Validation
The new regression fails on frozen upstream because the candidate instability entry is missing. Candidate benchmark script tests pass after the fix. The regression also checks Markdown evidence for each side and zero comparable cases. No runtime, browser, or model behavior changes.
