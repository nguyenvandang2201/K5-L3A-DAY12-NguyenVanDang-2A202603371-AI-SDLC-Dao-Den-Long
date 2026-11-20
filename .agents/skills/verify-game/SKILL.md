---
name: verify-game
description: Run reproducible simulation/build verification and save real evidence for a phase.
---

1. Read the current phase acceptance criteria in docs/spec/requirements.md.
2. Run npm run verify -- --phase phase-N. A nonzero command prevents a success report.
3. For a changed mechanic, add a deterministic scenario with an independent expected outcome.
4. Compare two CLI outputs for the same seed and inputs. Save scenarios and outputs with the phase.
5. Run browser smoke validation for visual changes and inspect the screenshot.
6. Record what was verified and what remains unverified. Do not claim hidden tests passed.
7. Commit code and evidence together, then tag that commit. Never rewrite earlier phase tags.
