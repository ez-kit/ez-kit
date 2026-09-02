---
'@ez-kit/data-grid-core': patch
---

Warn in development when a column seed has no feature to undo it.

`visibility: { initialHidden: true }` and `pinning: { initialSide }` both promise "starts this
way, the user changes it from here" — but the affordance that lets them change it (the columns
menu, the pin section of the column menu) belongs to the _table_-level feature. With that
feature off the seed still applies, so the column starts hidden or pinned with nothing to undo
it: `initialSide` becomes indistinguishable from the static `side`, and an `initialHidden`
column simply never appears.

The seed is deliberately still honoured — it is what the author wrote, and silently dropping
config is worse than applying it — and both are legitimate setups (a column can stay in the
model, feeding global search, without being shown). So `createTable` now says so with a
`console.warn` naming the column and the option, stripped from production builds, and the JSDoc
on both seeds stops claiming the user can always toggle them back.
