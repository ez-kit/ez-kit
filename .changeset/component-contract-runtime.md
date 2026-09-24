---
'@ez-kit/data-grid-react': patch
---

Name every missing UI-kit component, not nine of them

`<ComponentGuard>` turned a missing component into a named error for 9 of the 39 the contract
requires — the structural primitives plus three a definitively present config calls for. The other
30 reached React as `undefined` and crashed as "undefined is not a component", or, when the kit
omitted a whole group, as "cannot destructure property 'LoadingRow' of undefined" — one level away
from the cause.

The guard now has a second, lazy half. In development `useGridComponents()` hands back the registry
wrapped so that a required component the kit never registered resolves to a placeholder; **rendering**
it throws the same named error, naming the key and its group.

Throwing on the render rather than on the read is what makes it safe. Half the package destructures
a group eagerly and renders only part of it — `header-cell.tsx` takes `SortIndicator`, `Resizer` and
five filtering components in one go, then renders whichever the column asked for — so a guard that
fired on the read would fire on every header cell of a grid that sorts nothing, in a kit that never
claimed to support sorting.

Nothing changes for a kit that writes `satisfies FullGridComponents`, which is complete at compile
time, and nothing changes in production, where the registry is read directly. `<ComponentGuard>`
stays for what it is uniquely good at: `ConfirmDialog` and `FormShell` render on an interaction that
may be a dozen clicks into a flow, and a config that asks for them says so at mount.
