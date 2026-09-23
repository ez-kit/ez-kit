---
'@ez-kit/store-core': minor
'@ez-kit/zu-store': minor
'@ez-kit/va-store': minor
---

Add `clearFutures()` to the history API. It empties the redo stack and keeps every undo step, for a write that must not be its own undo step (and so runs under `skip`) but still makes the old redo branch unreachable — which `skip` alone left in place, so a later `redo` could restore a state from a branch the user had already left. Call it before the skipped write.
