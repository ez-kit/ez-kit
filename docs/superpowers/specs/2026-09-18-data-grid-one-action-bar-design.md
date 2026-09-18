# One action bar, two live sections

**Date:** 2026-09-18
**Status:** approved, pending implementation plan

## The problem

The grid documents a single shared action bar with two contents, and ships two independent
components that each draw a whole bar.

`packages/data-grid/react/react/src/data-grid/draft-bar.tsx`:

> Pending-draft section of the shared action bar. While a draft is pending it owns the bar
> outright: the selection section collapses to a non-interactive count chip.

`action-bar-variant.ts`:

> The selection section and the pending-draft section are one bar with two contents, so both
> must read the mode from this single place.

The implementation is two components with duplicated chrome — each renders its own sticky
anchor, its own `bg-card` surface, its own shadow, its own separators — kept apart by a
`return null` in `SelectionBar`:

```ts
// selection-bar.tsx
if (table.options.draft === true && table.draft.isDirty()) return null
```

### Failure 1 — the bars render on top of each other

`SelectionBar` subscribes to `rowSelection` only:

```ts
useDataGridState((s) => s.rowSelection)
```

A draft edit (a sort, a column filter, a search term) changes no `rowSelection`, so the
component does not re-render and the gate above never runs. Both bars mount at the same
sticky position.

Measured on `/examples/shadcn/production-deferred-apply` — select two rows, then click a sort
trigger:

```
draft-bar      x=391  w=417  y=456..500
selection-bar  x=514  w=172  y=454..500
```

The selection bar sits directly over the draft bar; `Reset` is clipped to `set`.

Two pieces of chrome that pretend to be one bar can only stay consistent while every gate that
hides one of them re-runs in lockstep with the other. That is the defect, and a subscription fix
would only postpone the next instance of it.

### Failure 2 — the mutual exclusion is not justified

The stated reason selection stands down during a draft is that applying a query can drop the
selected rows from the result set, making bulk actions act on a stale set.

That risk does not exist while the draft is pending. The selection is valid against the
**applied** query, which is what the user is looking at; deleting two selected orders right now
is correct. The set only goes stale _after_ Apply — and `table.draft.apply()` already clears the
row selection in the same state change. So live actions are suppressed over a hazard that is
already handled elsewhere.

## The design

One bar, two sections, both live, divided by a separator:

```
[2] ┃ [Delete] [actions] [×]  ┃  DRAFT [2 sorts] [1 filter]  [Reset] [✓ Apply]
```

Selection on the start side, draft on the end side, so `Apply` — the bar's only primary button —
lands at the far end where a primary action is looked for. The `×` belongs to the selection
section and therefore sits mid-bar, beside what it clears, rather than at the bar's end where it
would read as dismissing the draft too.

### Both kits already have the primitive

`src/components/ui/action-bar.tsx` exists in **both** kits — `ActionBar`, `ActionBarSelection`,
`ActionBarGroup`, `ActionBarSeparator`, `ActionBarItem`, `ActionBarClose`, with roving focus.
HeroUI's `SelectionBar` is built on it. shadcn's is not: it hand-rolls the sticky anchor and the
`div`s, leaving ~610 lines of the primitive unreferenced by anything in that kit. Both files are
hand-written and freely editable (AGENTS.md: the vendored-shadcn rule is specific to files
adapted from an upstream registry entry, and `action-bar` has none in either kit).

So the target composition is what the primitive was written for, and in shadcn it replaces hand-
rolled markup with a component already in the registry payload.

### Component contract

`core.ActionBar` — one kit component owning the chrome for both sections.

- `FEATURE_COMPONENTS[GridFeature.Core]` gains `'ActionBar'`.
- `FEATURE_COMPONENTS[GridFeature.Selection]` and `[GridFeature.Draft]` lose their only member
  each, so **both groups are removed** from `GridFeature`, from `FEATURE_COMPONENTS`, from
  `FEATURE_OPTIONAL_COMPONENTS`, and the derived tier types `GridSelectionComponents` /
  `GridDraftComponents` go with them. Neither feature owns a kit component any more; keeping an
  empty group would assert that it does.
- `core`, not `selection`: a grid with `draft` and no `rowSelectionFeature` still renders the
  bar, and must not depend on a kit advertising selection support.

This is a breaking change for both kits and for any external kit written against
`satisfies FullGridComponents` — which is exactly the contract's job, per AGENTS.md: a new or
removed key is a compile error rather than a runtime crash. The package is pre-1.0.

`ActionBar` is **required**, not a member of `FEATURE_OPTIONAL_COMPONENTS`: the package has no
correct fallback for it, unlike `TableWrapper` / `TableScroll` / `Layout`, which fall back to a
plain `div` and to the table.

### Props

```ts
export type ActionBarProps = {
	/** False when neither section has anything to show — the kit may animate out. */
	open: boolean
	/** `'floating'` (default) or `'inline'` — resolved from `selection.bar.variant`. */
	variant: ActionBarVariant
	/** Absent when selection is off, `bar: false`, or the grid registered no selection feature. */
	selection?: ActionBarSelectionSection
	/** Absent when `draft` is off or the draft is clean. */
	draft?: ActionBarDraftSection
}

export type ActionBarSelectionSection = {
	count: number
	selectedRows: Row<GridFeatures, ErasedRow>[]
	onClear: () => void
	/** Confirmation-aware bulk delete. Absent when `deleting.bulk` is off. */
	onDelete?: () => void
	/** `selection.bar.actions` resolved against this selection. Absent when none configured. */
	actions?: GridMenuItem[]
	start?: ReactNode
	end?: ReactNode
}

export type ActionBarDraftSection = {
	pending: PendingCount
	onApply: () => void
	onReset: () => void
}
```

`SelectionBarProps` and `DraftBarProps` are removed. Every field above is carried over from them
unchanged except `DraftBarProps.selectedCount`, which is deleted: the count is now the selection
section's own `count`, rendered once by the section that owns it, and it is interactive.

`open` is kept and stays independent of the sections being present, because shadcn's floating bar
animates out rather than unmounting and needs the last count to render while it does:

```
open = (selection?.count ?? 0) > 0 || draft !== undefined
```

A `selection` section with `count: 0` is therefore normal and expected while the bar is closing.

### Shared React package

`<DataGrid.ActionBar />` — one compound slot, replacing `<DataGrid.DraftBar />` and
`<DataGrid.SelectionBar />`, which are removed from the namespace and from `index.ts`.

The bug fix is structural: one component subscribes to both `rowSelection` and the draft, so
there is no second component to fall out of step with. It renders `null` only when both sections
are absent and `open` is false.

```tsx
<DataGrid.ActionBar />                       // the usual case

<DataGrid.ActionBar start={…} end={…} />     // additive slots — see below

<DataGrid.ActionBar>                          // full replacement
  {({ selection, draft, variant, open }) => …}
</DataGrid.ActionBar>
```

The render function receives `{ open, variant, selection?, draft? }`, where `selection` also
carries the `SelectionBarCallbackArgs` members (`table`, `clearSelection`, `selectedRows`) that
`DataGridSelectionBarRenderArgs` carries today. `onDelete` keeps its current significance: it
encodes the confirmation protocol, so a hand-rolled bar that reached for the configured handler
directly would skip the prompt.

**`start` / `end` stay selection-section slots**, at the position they occupy today — before the
built-in Delete and after the custom actions, inside the selection section rather than at the
bar's two ends. Their documented purpose is content that is not an action (a bulk-target select,
a counter), which is about the selection; the draft section has a fixed shape and never took
slots. Naming them for the bar while they feed one section is the smaller of the two confusions.

`resolveActionBarVariant` is unchanged, and so is `selection.bar.variant` as the config key —
it already governed both sections through that helper.

### Kits

Each kit gains `src/blocks/action-bar/ActionBar.tsx` and drops `blocks/draft/` and
`blocks/selection/SelectionBar.tsx`, with their `*-components.ts` registrations folded into the
kit's `core` group.

- **HeroUI** renders through its existing `ActionBar` / `ActionBarGroup` / `ActionBarSeparator`
  primitives, adding one `ActionBarSeparator` between the two sections.
- **shadcn** renders through the primitive it currently ignores, which removes the hand-rolled
  sticky anchor and the ad-hoc `div` separators from `SelectionBar`. Falling back to keeping the
  hand-rolled markup is acceptable if the primitive turns out to fight the floating variant; the
  section split and the single surface are what matters.

Both keep the two variants: `inline` as an in-flow strip, `floating` as the overlay.

### DOM contract

One bar means one root slot and two section slots:

| before                       | after                                                   |
| ---------------------------- | ------------------------------------------------------- |
| `selection-bar`              | `action-bar`                                            |
| `selection-bar-anchor`       | `action-bar-anchor`                                     |
| `draft-bar`                  | (gone — a section, not a bar)                           |
| `draft-bar-anchor`           | (gone)                                                  |
| `action-bar-selection`       | `action-bar-selection` (kept)                           |
| `draft-bar-pending`          | `action-bar-draft`                                      |
| `draft-bar-pending-part`     | `action-bar-draft-part`                                 |
| `draft-bar-selected-chip`    | (gone — the selection count is the selection section's) |
| `draft-bar-reset` / `-apply` | `action-bar-reset` / `-apply`                           |
| `selection-bar-action`       | `action-bar-action`                                     |
| `selection-bar-close`        | `action-bar-close`                                      |

`data-variant` (`inline` / `floating`) and `data-state` (`open` / `closed`) move to the one root.
The `data-pending-*` and `data-selected-count` attributes move there too, so a test can read the
whole bar's state off one element.

`apps/docs/test/e2e-slots.test.ts` compares the slot literals the specs address against the ones
the packages author, so a missed rename fails there rather than silently matching nothing — which
is precisely how #233 shipped a dead selector.

## Blast radius

Roughly 60 files reference the two bars.

- **Shared React package** — `contract.ts`, `types.ts`, `data-grid.tsx`, `index.ts`,
  `component-guard.tsx`, `test-utils.tsx`, all four layout presets, and the two bar modules
  replaced by one `action-bar.tsx`.
- **Both kits** — `blocks/draft/**`, `blocks/selection/SelectionBar.tsx`, their component
  registrations, and HeroUI's `styles.css` (it selects on the bar's slots).
- **Docs** — `selection/selection-bar.mdx`, `selection/index.mdx`, `layout/composition.mdx`,
  `production.mdx`, `examples.mdx`, `advanced/react.mdx`, `editing/deleting.mdx`,
  `row-actions/*.mdx`; the example components `selection-bar.tsx`,
  `selection-bar-inline.tsx`, `example-team-members.tsx`, `ProductionLayout.tsx`,
  `CrudLayout.tsx`; `feature-matrix.data.ts`; `page-type-map.ts`.
- **Tests** — `contract.test.ts`, `compound-slots.test.tsx`, `presets.test.tsx`,
  `data-grid.test.tsx`, both kits' `DraftBar.test.tsx`, the two bar tests in the shared package,
  and the e2e specs `selection/selection.spec.ts` and `editing/deleting.spec.ts`.
- **Registry payload** — the shadcn kit compiles into `apps/docs/public/r/data-grid.json`, so
  the change reaches every consumer who runs `npx shadcn add`.

`@ez-kit/data-grid-shadcn` is `private` and must not appear in a changeset; the change ships as a
major on `@ez-kit/data-grid-react`.

## Testing

- **Regression, written first:** a grid with `draft` and `selection` where a sort is applied
  while two rows are selected renders **one** element with `data-slot="action-bar"`, carrying
  both `[data-slot="action-bar-selection"]` and `[data-slot="action-bar-draft"]`. This is the
  test the current code fails.
- **Live actions during a draft:** with a pending draft and a selection, the bulk Delete is
  present and enabled, and pressing it reaches the configured handler (through the confirmation
  dialog when `deleting.bulk.confirmation` is set).
- **Each section alone:** selection with no draft feature; a dirty draft with no selection
  feature. Neither renders the other's section, and neither throws.
- **Neither:** nothing selected and a clean draft renders no bar content (`open: false`).
- **`presets.test.tsx`:** all four presets mount exactly one `<DataGrid.ActionBar />`, last.
- **Contract:** `contract.test.ts` asserts `COMPONENT_FEATURE.ActionBar === GridFeature.Core`,
  and that `GridFeature` no longer carries `Selection` / `Draft`.
- **e2e:** the existing selection and bulk-delete specs re-pointed at the new slots; one new spec
  driving selection and a draft together in both kits.
- **`e2e-slots.test.ts`** must pass without widening its regex — it is what proves the rename
  reached the specs.

## Out of scope

- The `floating` / `inline` variant vocabulary, and `selection.bar.variant` as the key that names
  it. Moving the variant onto the component as a prop was considered and rejected previously
  (AGENTS.md); this change does not reopen it.
- Where a layout puts the bar. It stays a layout decision, written last in all four presets.
- Any new config option. The two sections are composed, not configured.
