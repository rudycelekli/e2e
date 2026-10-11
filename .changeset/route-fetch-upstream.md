---
"@e2e-dev/web": minor
---

Add route.fetch for reading upstream responses before a route decision, with site headers, operation budgets, and explicit redirect responses.

Preserve upstream response metadata when its body is unavailable; text and JSON reads report ACTION_FAILED.
