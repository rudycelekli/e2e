# Confirm cache eviction before recording its outcome

## Context
Cache settlement assigns the report outcome `evicted` before awaiting a custom store deletion. If deletion rejects, the cache operation is swallowed as intended, but the report still claims eviction although the entry remains. This undermines the outcome evidence requested in issue #939.

## Decision
Assign the outcome only after the deletion resolves, both when the step immediately evicts a consumed recording and when attempt-end settlement evicts an unconfirmed one. A rejected custom deletion leaves the optional outcome absent, and settlement continues for other staged entries.

## Alternatives
Fail the run: rejected because cache persistence is best effort. Add a failure enum: rejected because absence already represents an unavailable settlement outcome and avoids changing the wire contract.

## Consequences
Successful operations and undeleted unconfirmed entries retain existing outcomes. Custom store failures no longer produce false eviction evidence. A store that resolves after swallowing its own failure remains responsible for its contract; this change cannot observe such failures.

## Validation
The new custom-store regression fails on frozen upstream (1failed,17passed), with a retained entry reported evicted. A second regression confirms that a rejected immediate eviction creates no successful staged outcome. Candidate cache tests assert absent outcomes for both paths, retained store bytes, and continued settlement of a later confirmed write. Broader cache/unit validation is recorded separately in local campaign logs.
