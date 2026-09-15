---
'@ez-kit/data-grid-react': minor
---

Add `context` — a typed bag of application and kit values carried alongside a grid and readable
from any component it renders, with `useGridContext()`.

The option travels the existing three option layers (kit factory < provider < instance) and merges
like every other one, so a kit can state its own settings once at the factory while an application
refines a single key at one call site. Members are declared by declaration merging on the exported
`GridContext` interface, which ships empty — a grid that never sets `context` is unchanged.

Reads are subscriptions: `useGridContext()` returns the whole object, and
`useGridContext((c) => c.some.value)` re-renders only when that value changes, which is what makes
it usable from a cell renderer.
