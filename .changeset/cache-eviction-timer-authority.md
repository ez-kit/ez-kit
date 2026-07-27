---
'@ez-kit/store-core': patch
---

Fix cache entries that could escape eviction permanently.

An unobserved entry's deadline was tracked on two different clocks: the eviction timer ran on
`setTimeout` (the runtime's monotonic timer clock) while `idleSince` was stamped from `Date.now()`
(the wall clock). The two drift, so the timer could fire while the wall clock still reported
marginally less than `gcTime` elapsed. The `isExpired` re-check then returned `false`, the entry
was not dropped — and because the sweep rescheduled nothing, no timer was left. The entry stayed
alive until the next `addObserver`/`removeObserver`/`clear`, i.e. effectively forever, and
`useFromCache` subscribers kept rendering the value of a supposedly evicted entry.

The timer is now the sole authority on the deadline: it is installed only when the last observer
leaves and cleared the moment one returns, so firing means the entry is due. The callback is
per-entry, so a fired deadline no longer sweeps siblings whose own `gcTime` is not up yet. The
wall-clock screen is also gone from `getInstance` — its answer could flip with no membership
change, while `useFromCache` recomputes the live instance only on a membership signature change.

No public API change.
