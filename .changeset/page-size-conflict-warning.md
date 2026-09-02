---
'@ez-kit/data-grid-core': patch
---

Warn in development when `pageSize` is set twice.

`pagination.pageSize` and `initialState.pagination.pageSize` set the same thing, and the seed wins
silently — so a deep link restoring a size from the URL quietly overrode the size written in the
code, with nothing to see. Both routes stay (one states the size, the other restores the user's),
but supplying both now logs which one won. Stripped from production builds.
