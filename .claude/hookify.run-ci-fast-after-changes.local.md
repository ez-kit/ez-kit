---
name: run-ci-fast-after-changes
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: (packages|apps)/.+\.(ts|tsx)$
---

You just modified TypeScript source under `packages/` or `apps/`.

Before reporting this change as complete, verify it with the fast CI gate:

    pnpm run ci:fast

This runs **lint + typecheck + test**. If you have several edits queued in this
turn, finish them all first, then run `pnpm run ci:fast` **once** at the end —
don't run it after every individual edit. Fix any failures before saying the
work is done.
