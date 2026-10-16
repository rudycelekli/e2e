---
"e2e": patch
---

Keep each serial member's measured duration with its retained verdict when a retry is interrupted or never reaches that member. Preserve completed member timing when the first attempt is interrupted too. Non-serial failed tests retain their failed attempt's duration after an interrupted retry.
