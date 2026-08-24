# Data Grid — Deferred Apply (batched filters & sorting)

**Date:** 2026-08-24
**Status:** Design approved, not implemented
**Packages:** `@ez-kit/data-grid-core`, `@ez-kit/data-grid-react`, `@ez-kit/data-grid-shadcn`, `@ez-kit/data-grid-heroui`, `@ez-kit/docs`

## Problem

In server-driven mode every change to sorting, a column filter or the global search
fires its own request. A user who wants two sort levels plus a filter pays three
round-trips and watches the table churn twice on the way to the state they actually
wanted.

The grid needs a mode where those changes accumulate as a **draft** and leave the grid
exactly once, when the user applies them.

## Scope

**In scope:** deferred sorting, column filters, global search — server-driven mode only.

**Out of scope, deliberately:**

- **Deferred mutations** (batching edit / create / delete into a pending journal). A
  genuinely different machine — optimistic row rendering, partial success, per-row
  error recovery — and a separate design. Only the UI surface is shared, and this
  design leaves room for that.
- **Client-side deferral** (holding the table still while the user composes a query
  over local data). Requires splitting "state the row models read" from "state the
  controls read"; server mode needs no such split, because under `manualSorting` /
  `manualFiltering` TanStack does not recompute row models at all — a draft written
  into state is visually inert until the consumer refetches. This is the entire reason
  the server-only version is cheap.
- **Deferred pagination.** Changing page is navigation, not intent. It stays immediate.

## Query axes

Fixed by the feature, not configurable. There is no setting that selects "what counts
as a query" — `deferredApply` controls only _when_ these axes leave the grid.

| Slice                                                                          | Part of the query | Deferrable                   |
| ------------------------------------------------------------------------------ | ----------------- | ---------------------------- |
| `sorting`                                                                      | yes               | yes                          |
| `columnFilters`                                                                | yes               | yes                          |
| `globalFilter`                                                                 | yes               | yes                          |
| `pagination`                                                                   | yes               | no — navigation is immediate |
| `rowSelection`, `expanded`, `columnVisibility`, `columnPinning`, `columnOrder` | no                | —                            |

## Public API

One config flag:

```ts
createDataGrid({
	data,
	columns,
	sorting: { manual: true },
	filtering: { manual: true },
	globalFiltering: { manual: true },
	pagination: { manual: true, rowCount },

	deferredApply: true,

	onStateChange: (updater) => {
		setState(updater)
		refetch()
	},
})
```

`onStateChange` keeps its current signature. No new callbacks — not `onDraftChange`,
not `onApply`. Applying a draft _is_ a state change, so the consumer's existing single
handler is the fetch trigger, and it is the same handler whether the flag is on or off.
Turning the flag on changes only _when_ it fires.

Table namespace:

```ts
table.draft.isDirty(): boolean
table.draft.getPendingCount(): { sorting: number; filters: number; search: boolean }
table.draft.get(): QueryDraft
table.draft.set(next: Partial<QueryDraft>): void
table.draft.apply(): void
table.draft.reset(): void
table.draft.resetAxis(axis: QueryAxis): void
```

Two vocabularies on purpose. The config key names a **mode** — application is deferred.
The runtime names the **object** that mode produces — what the user has typed but not
yet applied is a draft. They are different kinds of thing, and the sentence binding them
is self-evident: application is deferred, so until then what you typed is a draft.

`draft` was rejected as the config key. Top-level keys in this config name capabilities
(`sorting`, `filtering`, `selection`, `creating`, `editing`), and a bare `draft: true`
sitting beside `creating` and `editing` reads as _draft rows_ — unsaved records — which
is precisely the deferred-mutations feature listed as out of scope above. A name whose
most likely misreading is a neighbouring roadmap item is the wrong name.

`deferredApply` without `manual: true` on at least one deferrable axis is a
**dev-time error** at table creation. Client-side deferral is out of scope, and failing
loudly beats a flag that silently does nothing.

## Ownership model

The grid owns the draft. This is the load-bearing decision; everything else follows.

- `state.draft` holds the draft values for the three deferrable axes.
- `state.sorting` / `state.columnFilters` / `state.globalFilter` hold the **applied**
  values — the query the server has actually seen.
- The state handed to TanStack merges the draft over the applied values, so headers,
  filter chips and the toolbar render the draft.
- The state emitted through `onStateChange` carries the applied values, with
  `state.draft` stripped. When that stripped state is unchanged — which is every
  draft edit — **`onStateChange` is not called at all.** Emitting an identical snapshot
  would be noise at best and a refetch at worst, and skipping it makes "`onStateChange`
  fires ⇒ the query changed" literally true rather than merely usually true.

What goes in through the controlled `state` prop is what comes out through
`onStateChange` — the loop stays symmetric, and a consumer writing the plain
`state={state} onStateChange={setState}` pattern cannot lose the draft, because the
draft was never theirs to lose.

**Rejected alternative:** letting the draft ride in the ordinary state slices and
distinguishing the two kinds of change with a meta argument
(`onStateChange(updater, { apply: 'draft' | 'applied' | 'unchanged' })`). Cheaper — no
merge layer — but it leaks a transient, local value into every state snapshot, into URL
sync and into any server cache keyed on state, and every consumer has to learn to
ignore it. Rejected in favour of a smaller public surface at the cost of one internal
merge layer.

### Control vs. observation

The draft does not participate in the controlled loop, but it is readable, seedable and
writable:

```ts
const draft = useDataGridSelector(grid, (s) => s.draft)

createDataGrid({
	deferredApply: true,
	initialState: { draft: restoredFromStorage },
})

table.draft.set({ columnFilters })
```

Seed + observe + imperative write covers persistence (localStorage, IndexedDB, a
shareable link) — `@ez-kit/va-store`'s persist engine takes the draft as one more
source with no new code. What it does not offer is a fully controlled draft where the
consumer intercepts each keystroke and substitutes a value. That petition is what would
cost the symmetry, and a value needing that much external control is not a draft — it
belongs in the applied query.

## Lifecycle

```
header click     state.draft.sorting updated
                 applied sorting untouched
                 outward state unchanged → onStateChange NOT called
                 action bar shows "Sorting 1 · Reset / Apply"

filter input     same, for columnFilters

apply()          pagination.pageIndex := 0
                 applied := draft, draft cleared
                 row selection cleared
                 onStateChange fires ONCE with the new query → one request

reset()          draft cleared, applied untouched
                 outward state unchanged → onStateChange NOT called

page change      pagination changes, applied query untouched
                 onStateChange fires → refetch with the APPLIED query
                 a dirty draft is not silently picked up
```

Two details that are easy to get wrong:

- **`pageIndex` resets inside the same transaction as the apply**, before listeners are
  notified. A separate reset would emit a second state change and cost a second request
  — the exact thing the feature exists to prevent.
- **`applied` is seeded from `initialState`** so a grid with an initial sort is not born
  dirty.

With the flag off, `state.draft` is always empty and every query change is applied
on the spot. The feature's own tests must cover that path too: a table without
`deferredApply` must behave byte-for-byte as it does today.

## Reset semantics

`reset()` returns the query **to the applied values**. It is not "clear all filters" —
that is a separate, existing action, and conflating the two would make the bar's
secondary button unpredictable. `resetAxis(axis)` backs out one axis, and is what the
dismiss control on an unapplied filter chip calls.

## UI

### One action bar, with priority

Selection and pending-query share a single bar built on the existing
`components/ui/action-bar.tsx` primitive in both kits. They are not two equal segments
separated by a rule: that would put two primary buttons (`Delete` and `Apply`) and two
different cancels in one strip.

The reason is behavioural, not visual: **applying a query invalidates the selection.**
Rows selected before a filter change may not survive it, so bulk actions over that
selection are actions over a stale set.

- `table.draft.isDirty()` → the bar belongs to the query: a compact "3 selected" chip on
  the left for context with no actions of its own, `Reset` / `Apply` on the right.
- Otherwise → the bar is the selection bar as it is today.
- `apply()` clears the selection. Carrying a stale selection across a query change is
  worse than losing it.

`SelectionBar` becomes a section of this bar rather than a standalone panel.

### Unapplied state must be visible in place

The bar tells you _that_ something is pending; the controls must tell you _what_. An
unapplied sort renders its order index with a muted arrow; an unapplied filter chip
renders in a pending treatment with a dismiss control wired to `resetAxis`.

Per the repository's architecture constraint, `data-grid/react/react` carries **zero**
styling: it adds `data-draft-sorting` / `data-draft-filter` attributes, and `shadcn` and
`heroui` style them. Two changes in the kits, not one in the react package.

### Apply triggers besides the button

`Enter` in a filter input applies the whole draft — composing a query and pressing Enter
is the reflex, and honouring it removes most trips to the bar.

The Apply button has no pending state of its own. The grid hands the query to the
consumer and stops; the request is theirs, and the existing `loading` feature is how its
progress reaches the grid.

## Testing

- **core** — draft accumulates without touching applied and without emitting a single
  `onStateChange` call; `apply()` emits exactly one
  state change carrying every axis plus the `pageIndex` reset; `reset()` and
  `resetAxis()` restore from applied; `applied` seeds from `initialState`; the flag off
  is behaviourally identical to today; `deferredApply` without any `manual` axis throws at
  creation.
- **react** — controlled mode round-trips without the draft escaping; the draft survives
  a re-render driven by a controlled state update; `draft.set()` and `initialState` seeding;
  bar priority flips with `isDirty()`; `apply()` clears the selection.
- **kits** — `data-draft-*` attributes reach the DOM and both kits style them; the bar
  renders each of its three shapes (selection only, query only, both).
- **docs** — a new example on the production page: two sorts plus a filter, one request.
  Registered in `manifest.json` and `registry.ts`.
