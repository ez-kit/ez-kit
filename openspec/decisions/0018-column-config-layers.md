# 0018. Each column surface lays its own config over `cell.config`

- Status: Accepted
- Recorded: 2026-10-28
- Related: [0016-bundle-types-inline-columns](./0016-bundle-types-inline-columns.md), [0007-core-primitives-contract](./0007-core-primitives-contract.md)

## Decision

**A column's filter, editor and create field each take a config layer — `filtering.config`,
`editing.config`, `creating.config` — laid over `cell.config` key by key, shallowly; each surface's
renderers get the one merged `config`.** The create field takes `cell.config` < `editing.config` <
`creating.config`, the same inheritance as its list; the cell keeps `cell.config` alone. A layer
never states a value list — `<surface>.items` / `useItems` do, and sit on top. The merged filter
`config` also reaches the kit's `MultiSelectFilter` and `BetweenInput` and `FilterModel.config`,
never `core.Input` or `OperatorSelect`. The grid reads no layer. Its type is declared per bundle,
`createDataGrid({ columnConfig: defineColumnConfig<{ filtering?, editing?, creating? }>() })`, as a
trailing type parameter defaulting to unchecked; an undeclared surface and every surface of a bundle
without one accept any keys. Filter fields carry an unchecked layer, as their `cell` is unchecked.

## Context, rationale and rejected alternatives

A kit replacing its multi-select with a tag editor needed a per-column switch between pick-only and
creatable. There was nowhere to put it: `ColumnFilteringConfig` is a closed type, a `ColumnDef` has
no free `meta`, bundle columns reject unknown keys (ADR 0016), and `MultiSelectFilterProps` carried
no config. `cell.config` reached the filter's own `component`, but every surface reads it, so a
filter-only flag there was visible to the cell and the editor — and still never reached the slot.
The docs had said "there is no filter-only config: use a closure", but a closure is a new component
per column, remounted whenever the columns are rebuilt, so one reusable filter component could not
learn its column's setting at all.

**A dedicated flag in ez-kit (`allowsCustomValues`) — rejected.** The grid would carry a key it
never interprets, and the next kit would arrive with the next flag.

**A second prop beside `config` (`filterConfig`) — rejected.** On a renderer `config` already means
`cell.config`; a second name for the same column's config breaks one-concept-one-word, and every
renderer would merge the two by hand. Layers keep one `config` everywhere, and a column without
layers hands its renderers the very object it did before.

**Fallback instead of merge — rejected.** A list is one value and falls back whole; a config is a
set of keys, and a column overriding one key would have to repeat the whole base.

**Module augmentation (`interface ColumnConfigExtensions {}`) — rejected.** It is program-wide: two
kits in one app collide, and `data-grid-context-typing` already forbids declaration merging for the
same reason.

**Inferring the layer type from the registered slots — rejected**, for the reason
`defineCellType`'s docblock gives: several renderers read one layer, and an inference site per
renderer infers something arbitrary from the ones that are missing.

**A phantom key on the cell-type registry type (no new parameter) — rejected.** Less noise, but the
registry stops being only a registry.

**Typing the layer per cell type — not done.** `filtering` and `cell` are sibling fields, so the
layer cannot see `cell.type`; correlating them would distribute `ColumnDefCommon` over every cell
type. A layer key is therefore accepted on any column of the bundle.

**An undeclared surface rejected outright (`never`) — rejected.** No prebuilt kit declares layers,
so a column's own `component` could not be handed a layer on any of them.

Known consequences. A declared layer and the unchecked one both spell out `items?: never` /
`useItems?: never`; besides rejecting a list, that keeps unchecked columns (from core's own
`createColumns`) assignable to a declared layer, which TypeScript treats as a weak type. A kit that
declares a layer closes it: a consumer cannot add a key of their own to it on that kit's grids.
A declared layer is rebuilt as a key-remapped mapped type, not with `Omit`: `Omit` goes through
`keyof`, which for a layer with an index signature is `string`, and would drop every key the layer
names. A bundle that declares `columnConfig` must name it as `DataGridBundle`'s fourth type argument;
a default-argument annotation no longer fits it. The create field inherits the editing layer at
runtime, but the two surfaces are declared independently, so a key both read is given one type in
both by the kit. Columns from an unchecked builder (core's `createColumns`, or a bundle without
`columnConfig`) pass into a declared bundle unchecked — the price of keeping them assignable.

The merged object is cached on what it is built from — the base, each layer and the list's
`items`, held weakly — so a renderer gets the same `config` while its column and list are
unchanged, as the cell's own `cell.config` always was. Not on the meta: a filter target rebuilds
its `{ cell, filtering }` on every render, and a cache keyed on it would never hit.

The type-check cost was measured with `tsc --extendedDiagnostics --incremental false` on `apps/docs`
before and after; the change stayed inside run-to-run noise. Guards:
`packages/data-grid/react/react/src/create-data-grid-columns.test.tsx` (typing),
`packages/data-grid/react/react/src/data-grid/config-layers.test.tsx` (merge per surface),
`packages/data-grid/react/react/src/data-grid/config-layers-slots.test.tsx` (slots and model),
`packages/data-grid/core/src/column/map-columns/map-columns.test.ts` (resolution and the list
warning).
