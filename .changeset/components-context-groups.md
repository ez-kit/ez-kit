---
'@ez-kit/data-grid-react': patch
---

Fix: reading the component registry outside a grid no longer throws an unnamed error.

`useGridComponents()` is typed `FullGridComponents`, and its context default was
`{} as FullGridComponents` — a type claiming every feature group while the value held none. The
ordinary reading shape is `const { Button } = useGridComponents().core`, so outside a `<DataGrid>`
that threw `Cannot destructure property 'Button' of undefined`, naming neither the slot nor the
reason. Every one of the fifty-odd readers in the package carried it.

The default is now one empty object per feature group, built from the feature set so a new group
cannot be forgotten. A component rendered outside a grid reads `undefined` for a slot, which is what
it already reads _inside_ one for an unregistered optional slot — so the two cases finally behave the
same.

**A missing slot deliberately stays `undefined` rather than becoming an error.** Branching on it is a
supported shape — `const { Tooltip } = useGridComponents().core; if (!Tooltip) …` — and a dev-mode
throw was written, measured against the suites and reverted: it failed 25 cases across the two kits,
all of them that exact pattern. Reporting a slot a kit _should_ have registered remains
`ComponentGuard`'s job, inside a grid, where "should" is knowable.
