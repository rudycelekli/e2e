---
"@e2e-dev/web": minor
---

Add attempt-owned offline network emulation that survives context replacement and CDP recovery without leaking to later ordinary attempts.

Keep a successfully applied network change across page creation in the same browser context; reject late completion after context replacement.
