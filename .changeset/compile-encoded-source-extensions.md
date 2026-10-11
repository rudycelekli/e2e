---
"e2e": patch
---

Recognize TypeScript and JSX source extensions after decoding a file URL, so valid URLs such as `file:///project/test%2Etsx` use the existing compilation hooks. Decode installed-file ownership too, preserving package compilation defaults even when `node_modules` is encoded.
