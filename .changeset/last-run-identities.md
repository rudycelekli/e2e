---
e2e: patch
---

Reject previous run reports with missing, non-string or empty result identities before --last-failed can silently omit their failed tests.

Require a nonempty agent identity in the report schema, matching the field every producer already writes, including default-agent results.
