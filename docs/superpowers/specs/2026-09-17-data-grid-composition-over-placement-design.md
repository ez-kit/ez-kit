# Composition over placement: the grid's layout moves from config to JSX

**Date:** 2026-09-17
**Packages:** `@ez-kit/data-grid-react`, `@ez-kit/data-grid-shadcn`, `@ez-kit/data-grid-heroui`, `@ez-kit/docs`

## Problem

The data-grid config carries eight options whose whole job is to tell one component — the
default `<Toolbar>` and the default layout — what to mount and in what order:

```ts
filtering:       { chips: { position: 'above' | 'below' },
                   panel:  { placement: 'toolbar' | 'above' },
                   toolbar: { alwaysShow: boolean },
                   variant: 'inline' | 'popover' | 'panel' }
globalFiltering: { toolbar: { placement: 'start' | 'end' } }
pagination:      { pageSizer: { placement: 'toolbar' | 'footer' } }
sorting:         { toolbar: boolean }
visibility:      { toolbar: boolean }
```

Two things are wrong with this, and the second is the one that matters.

**They are the wrong vocabulary.** These are not statements about the grid — they are
arguments to `<Toolbar>` and `<DefaultLayout>` that leaked into the table's config. The
controls themselves already prove it: `VisibilityTrigger`, `SortMenuTrigger` and
`GlobalFilterInput` read none of these flags (grep them — there is not one reference).
Rendering the component is sufficient; the flags exist only so that the _default_ layout can
decide. `PageSizer` reads `pagination`, but never `placement`. `ClearFiltersButton` reads
`filtering.toolbar`, but only for `alwaysShow`, which is behaviour, not position.

**They tax every new arrangement.** Each new layout needs a new enum value or a new option.
`globalFiltering.toolbar.placement: 'start' | 'end'` was added in `1744b71c` precisely
because a tablecn-style bar was wanted. The arrangement it buys is one line of JSX:

```tsx
// today — five options to describe an order the JSX would show at a glance
<DataGrid
	globalFiltering={{ toolbar: 'start' }}
	filtering={{ panel: 'toolbar', toolbar: true }}
	visibility={{ toolbar: true }}
	sorting={{ toolbar: true }}
	pagination={{ pageSizer: 'footer' }}
/>
```

The compound namespace that would express it already exists — 29 members hung off `DataGrid`,
and `DataGrid` already renders `children ?? <DefaultLayout/>`.

### What this is not

**Not a bundle-size fix.** The flags cost zero bytes: `Toolbar` imports all seven controls
statically and unconditionally, and a runtime `&&` inside JSX is not something a bundler
removes. Measured, `dist` built, esbuild `--bundle --minify`, React external:

| import from `@ez-kit/data-grid-react`            | bytes   |
| ------------------------------------------------ | ------- |
| `{ FilterChipsPosition }` — a plain const object | 157 949 |
| `{ useDataGrid }`                                | 157 949 |
| `{ DataGrid }`                                   | 157 948 |
| `import *`                                       | 170 227 |

The `./index` entry does not tree-shake at all: importing one string constant costs the same
158 kB as the whole grid. The cause is in `dist/index.js:4476-4504` — 29 impure top-level
property assignments (`DataGrid.Toolbar = Toolbar;` …) that no bundler can drop, so every
component and everything it reaches is anchored for any consumer. That is the same defect class
already documented in `AGENTS.md` for `tableFeatures({…spread})` and for a bare
`createStoreCache()`, and it is a **separate spec**, to be written after this one. Note the
irony this creates: composing through `DataGrid.X` while that entry is one blob makes bytes
_worse_, not better — a consumer who writes three components still pays for 29. §4 below is
what makes the follow-up spec able to pay off; it does not pay off on its own.

## Design

### 1. The dividing line

**Config states behaviour. JSX states composition.** An option survives if it answers "what
does this grid do", and is removed if it answers "where does this control go" or "is it
mounted".

Removed. `FilteringVariant` leaves the public API with `filtering.variant` (§3). The four
placement enums are decided by one test rather than assumed:

> **An enum survives iff something other than the removed config still needs it.** The option
> goes; the vocabulary stays when a component prop or a `data-*` attribute carries it. A layout
> states position by _where_ it renders a component — but CSS cannot read a JSX position, so
> wherever a kit's stylesheet selects on a `data-*` value, that value stays settable as a prop
> and its closed set stays exported. (Inlining it as `'above' | 'below'` is not the alternative:
> the repo's closed-set rule requires a const object plus a union.)

`FilterChipsPosition` is on the surviving side, found during implementation:
`<DataGrid.ActiveFiltersBar position>` already stamps `data-chip-position`, and both kits'
stylesheets select on it (`shadcn/src/styles.css:17,20`, `heroui/src/styles.css:72,75`) for the
margin above versus below. So `filtering.chips` goes, the enum and the prop stay, and the
component's default moves to a constant of its own instead of reading `DATA_GRID_DEFAULTS`.
`PageSizerPlacement`, `FilterPanelPlacement` and `GlobalFilterPlacement` were checked against the
same test and all three failed it — no kit stylesheet selects on a value of theirs — so all three
are deleted, along with `FilteringVariant`.

| removed                   | replaced by                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `filtering.chips`         | where `<DataGrid.ActiveFiltersBar/>` sits                                             |
| `filtering.panel`         | where `<DataGrid.FilterPanel/>` sits                                                  |
| `filtering.toolbar`       | `<DataGrid.ClearFiltersButton alwaysShow/>` — a prop of the component that honours it |
| `filtering.variant`       | §3                                                                                    |
| `globalFiltering.toolbar` | `<DataGrid.Toolbar start={<DataGrid.GlobalFilterInput/>}/>`                           |
| `pagination.pageSizer`    | where `<DataGrid.PageSizer/>` sits; `<BottomBar/>` instead of `<Pagination/>`         |
| `sorting.toolbar`         | `<DataGrid.SortMenuTrigger/>`                                                         |
| `visibility.toolbar`      | `<DataGrid.VisibilityTrigger/>`                                                       |

Kept, because each answers a behaviour question: `rowActions.placement` (what a cell
_contains_, not where the cell goes), `selection.bar.variant` (`floating` is also an
appearance the kit styles), `align`, column and row pinning, `pagination.pageSize`,
`layout.classNames`, and `Toolbar`'s own `start` / `end` / `children` / `className`.

`sorting: false` and friends keep working exactly as they do — registering a feature, enabling
it and composing its UI stay three separate axes, as `AGENTS.md` already records.

### 2. `core.Layout` — the default layout becomes injectable

`DataGrid` resolves its body as:

```
children  ??  components.core.Layout  ??  <DataGrid.Table/>
```

`core.Layout` joins **`FEATURE_OPTIONAL_COMPONENTS`**, the tier beside `FEATURE_COMPONENTS`
where `core.TableWrapper` and `core.TableScroll` already live. That tier's admission rule is
recorded in `AGENTS.md` — "a key belongs in that tier only when the package has a correct
answer without it" — and here the answer is `<DataGrid.Table/>`. Because the tier stays out of
`ComponentsFor`, an external kit that wrote `satisfies FullGridComponents` keeps compiling.
This is deliberately **not** a new prop: reusing the components DI means the app-wide form
(`DataGridOptionsProvider`, `createDataGrid({ components })`) and the per-instance form
(`components` on one grid) both come for free.

`@ez-kit/data-grid-react` therefore has no rich default and no dependency on a
`DefaultLayout`: a bare `<DataGrid data columns features/>` renders a table and nothing else.

**The rich default is bound by the kits.** Each kit's prebuilt `DataGrid` (`data-grid.tsx`)
binds `core.Layout` to the full preset, exactly as it already binds `allDataGridFeatures`, and
for the same reason and with the same caveat: the binding must live in `data-grid.tsx`, not in
`index.ts`, or every grid composed through `createDataGrid` inherits it silently. So
`<DataGrid>` from `@ez-kit/data-grid-shadcn` keeps rendering toolbar, table and pagination with
no children, and quick start is unchanged; `createDataGrid` composes and pays for what it names.

Nested grids inherit `components` today and will inherit `Layout` with it. That is correct —
`components` is meant to describe a subtree — and unlike `GridFactoryDefaultsProvider` it is
not closed off at `DataGridControlled`. No recursion risk: a layout renders `DataGrid.Table`,
never `DataGrid`.

### 3. `filtering.variant` dissolves into composition

The enum holds two orthogonal axes at once, which is why "filters in the header _and_ in a
panel" is currently inexpressible — there is no enum value for it. `header-cell.tsx` reads it
in two places for two different questions:

```
:253  canFilter = … && variant !== 'panel'     // is there a filter in the header at all — position
:320  variant === 'popover' && canFilter       // what it looks like — appearance
:325  variant !== 'popover' && canFilter
```

Both axes move to the render-function of `<DataGrid.HeaderCell>`, which **already** hands back
the header's ready-made parts (`header-cell.tsx:41-54`): `label`, `sortTrigger`, `menu`,
`filter`, `resizer`. Not rendering `filter` is what removes it from the header — no flag, no
runtime registration between siblings, no first-frame flicker, no SSR divergence. The one
change needed is dropping the `variant !== 'panel'` guard on `:253` so `filter` stops being
forced to `null`.

`DataGridHeaderCellRenderArgs` gains one member so the appearance axis is expressible too:

```ts
/** The column's filter control. `null` when the column is not filterable. */
filter: ReactNode
/** The same control behind the kit's popover trigger. `null` when not filterable. */
filterPopover: ReactNode
```

Filters in a panel _and_ in the header is then just: render `filter` and mount
`<DataGrid.FilterPanel/>`. Both write to one `columnFilters` slice, which is two inputs bound to
one value — supported, and the reason this needed no coordination in the first place.

The cost, stated plainly: choosing the popover now means expanding a layout down to
`HeaderCell` — four levels instead of one word. §4 is what keeps that from being a regression
in practice.

**Explicitly deferred:** a different filter control in the header than in the panel (one
`column.filtering.component` today). That is a third axis, no consumer has asked for it, and it
is out of scope for 1.0.

### 4. Layout presets

In `@ez-kit/data-grid-react`, as pure composition with no authored class — the package's
no-styles rule is untouched, and one set serves both kits with no duplication. Kits and
applications add their own freely; that is the point of the whole change.

Four, covering what the removed options could express:

- the full default the kits bind to `core.Layout` — toolbar, table, pagination
- page sizer beside the pagination controls in a `<BottomBar/>` (was `pageSizer: 'footer'`)
- search leading, filter panel, actions trailing (was the five-option tablecn arrangement)
- popover filters in the header (was `variant: 'popover'`)

Names are **not** settled by this spec and are agreed separately before implementation.

## Migration

0.x, so this ships as a breaking minor with no deprecation window. Every removed option becomes
a `TS2353` at the call site, which is the diagnostic the guard catalogue is built around.

- 56 docs examples and quick start reach the grid through a kit, so the kit-bound `core.Layout`
  keeps them rendering unchanged. Only examples that _set_ a removed option need editing.
- `apps/docs/content/docs/data-grid/**` — 9 pages name `placement`, 7 `chips`, 5 `toolbar:`.
- `page-type-map.ts` must be edited in the same commit: roughly 15 names leave, and the test
  fails on a drifted per-table count, not only on a missing name.

**One behaviour is deliberately not preserved.** The old default mounted a page sizer in the
toolbar when the author **wrote** `pagination.items`, gating on the authored config
(`paginationCfg?.items !== undefined`). `ResolvedGridOptions.items` resolves to a default list
under any paged pagination, so a preset gating on it would mount a selector on every paginated
grid — louder than the old default rather than a restoration — and restoring it exactly would
need a resolved "the author named a list" flag, which is a mount decision back in the config.
`DefaultLayout` therefore mounts no sizer; `BottomBarLayout` does, and
`<DataGrid.Toolbar start={<DataGrid.PageSizer />} />` is the toolbar recipe. Because the cost of
that is discoverability — writing `items` and seeing no control is a silent no-op — it is stated
in `DefaultLayout`'s docblock and in `ReactPaginationConfig.items`', and a preset test asserts
the split so a later addition fails rather than going quiet.

## Testing

- `feature-optionality.test.tsx` — unchanged in intent; the three structural features stay.
- `compound-composition.test.tsx` / `compound-slots.test.tsx` — extended: each preset gets a
  render test asserting the set of mounted slots.
- `filter-panel-default-layout.test.tsx`, `footer-default-layout.test.tsx`,
  `global-filter-placement.test.tsx` — these test the removed options and are rewritten as
  preset tests.
- New: `<DataGrid>` with no children and no `core.Layout` renders a table and nothing else;
  with `core.Layout` in `components` renders that; `children` beats both.
- New: `filter` rendered in `HeaderCell` **and** `<FilterPanel/>` mounted — both controls
  present, both reflecting one `columnFilters` value.
- `docs-option-names.test.ts` — counts updated with the map.
- `e2e-slots.test.ts` — unaffected; no `data-slot` value changes.

## Out of scope

The 158 kB non-shaking `./index` entry. Its fix — components as named exports, `DataGrid.X`
sugar on its own subpath, mirroring `features/all` — is the next spec, and is what turns §2
and §4 into actual bytes saved.
