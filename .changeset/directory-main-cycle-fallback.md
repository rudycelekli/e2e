---
"e2e": patch
---

Bound directory `package.json` main traversal to distinct physical directories, including symlink aliases. Cyclic main redirects now reach the existing index fallback or normal unresolved-import diagnosis rather than overflowing the loader; valid main chains retain priority.
