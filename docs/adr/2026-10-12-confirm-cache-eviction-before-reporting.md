# Confirm cache eviction before recording its outcome

## Context
Cache settlement assigns the report outcome `evicted` before awaiting a custom store deletion. If deletion rejects, the cache operation is swallowed as intended, but the report still claims eviction although the entry remains. This undermines the outcome evidence requested in issue #939.

## Decision
Assign the outcome only after the deletion resolves, both when the step immediately evicts a consumed recording and when attempt-end settlement evicts an unconfirmed one. A rejected custom deletion leaves the optional outcome absent, and settlement continues for other staged entries.

## Alternatives
Fail the run: rejected because cache persistence is best effort. Add a failure enum: rejected because absence already represents an unavailable settlement outcome and avoids changing the wire contract.

## Consequences
Successful operations and undeleted unconfirmed entries retain existing outcomes. Custom store failures no longer produce false eviction evidence. The default file store now suppresses only ENOENT, which confirms the entry is already absent; other unlink errors reject into the existing best-effort caller. A custom store that resolves after swallowing its own failure remains responsible for its contract; this change cannot observe such failures.

## Validation
The new custom-store regression fails on frozen upstream (1failed,17passed), with a retained entry reported evicted. A second regression confirms that a rejected immediate eviction creates no successful staged outcome. Candidate cache tests assert absent outcomes for both paths, retained store bytes, and continued settlement of a later confirmed write. Broader cache/unit validation is recorded separately in local campaign logs.

## Hosted review correction

The published revision4381e0af6425b088dbdd44c0b00a243846b845a9 still swallowed all default-store unlink errors. A real temporary-directory regression writes an entry, removes directory write permission, and verifies retained exact bytes plus absent eviction outcome. It fails on that frozen published revision. The fixture restores permissions before cleanup, skips Windows and privileged root where this POSIX permission mechanism cannot demonstrate the failure, and controls already-missing entry deletion. Final candidate results are recorded in local logs.
