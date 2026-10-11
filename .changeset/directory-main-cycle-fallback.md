---
"e2e": patch
---

Bound directory `package.json` main traversal to distinct paths. Cyclic main redirects now reach the existing index fallback or normal unresolved-import diagnosis rather than overflowing the loader; valid main chains retain priority.
