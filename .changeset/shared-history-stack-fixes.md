---
'@ez-kit/store-core': minor
'@ez-kit/zu-store': minor
---

Fix several `withHistory` correctness issues in the shared `@ez-kit/store-core/history` engine, which
`@ez-kit/zu-store`'s `withHistory` middleware builds on:

- **`goto` no longer trims.** Jumping to an absolute timeline position used to run the same `limit`-cap
  trim as `record`, which could silently delete a reachable state instead of just reordering the
  existing timeline — `goto` introduces no new entries, so there was never anything for a cap to defend
  against. It now only reorders `[...pasts, current, ...futures]`.
- **`undo` and `redo` are mutually inverse under an over-limit seed.** Trimming an over-limit stack
  (reachable via `defaultPasts` / `defaultFutures`, not just accumulation) used to drop from the wrong
  end on `undo`, discarding the very state `undo` had just put back instead of the farthest one. `undo`
  now trims `futures` from the tail, so the next `redo` lands where `undo` left it.
- **`isPaused` is observable during `skip`.** A subscriber reading the published snapshot from inside
  `skip(fn)` now sees `isPaused: true` for `fn`'s duration, not just once it returns — useful for UI
  (e.g. a dimmed undo button) that reacts to the published state rather than calling `isPaused`
  directly.
- **History publishes before the restore write**, not after — a subscriber reacting to `undo` / `redo`
  / `goto`'s resulting write now sees the new `pasts` / `futures` split already in place.
- **Redundant `pause()` / `resume()` no longer notify.** Calling either when already in that state is
  now a no-op — no snapshot publish — instead of firing a needless notification.
- **`HistorySnapshot`'s fields (`pasts`, `futures`, `limit`, `isPaused`) are now `readonly`**, matching
  that a subscriber should never mutate a published snapshot in place.
