# 0006. The config states behaviour; JSX states composition

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)
- Related: [0008-layouts-and-optional-slots](./0008-layouts-and-optional-slots.md), [0014-tree-shaking-guarantees](./0014-tree-shaking-guarantees.md)

## Decision

**The config states behaviour; JSX states composition — there are no placement options.** The eight removed ones stay removed. An enum survives only if a kit stylesheet selects on its `data-*` value (`FilterChipsPosition`); check by enumerating attribute selectors in both kits, not by grepping values. When removing an option, sweep for the behaviour it described, not only its name. `DefaultLayout` mounts no page sizer. `filtering.variant` is gone: header filters vs. panel is `<DataGrid.HeaderCell>`'s render function — no runtime self-registration.

## Context, rationale and rejected alternatives

- **The config states behaviour; JSX states composition. There are no placement options, and
  adding one back is the regression.** Where a control sits, and whether it is mounted at all,
  is said by rendering it: `<DataGrid.Toolbar end={<DataGrid.VisibilityTrigger />} />`. Eight
  options used to say it instead — `filtering.chips` / `.panel` / `.toolbar` / `.variant`,
  `globalFiltering.toolbar`, `pagination.pageSizer`, `sorting.toolbar`, `visibility.toolbar`.
  All eight are gone.

  Their enums are a separate question, decided by one test: **an enum survives iff something
  other than the removed config still needs it.** A layout states position by _where_ it renders
  a component, but CSS cannot read a JSX position — so wherever a kit's stylesheet selects on a
  `data-*` value, that value stays settable as a component prop and its closed set stays
  exported, with the prop's default a constant in the component's own module rather than a read
  of `DATA_GRID_DEFAULTS`. `FilterChipsPosition` survives on exactly that ground:
  `<DataGrid.ActiveFiltersBar position>` stamps `data-chip-position`, and both kits style the
  strip's margin off it. Do not inline a surviving set as a literal union — the closed-set rule
  (const object plus union) still applies.

  Run that check by **enumerating every attribute-value selector in both kits' `src`** (css, tsx
  and ts, so `blocks/` is covered) and comparing, never by grepping for the enum's values. Two
  live selectors share literals with removed enums and a value-grep flags both:
  `[data-pin-shadow='start'|'end']` is column pinning (`ColumnPinSide`, surviving) and
  `[data-pinned='top'|'bottom']` is row pinning. Neither was ever fed by
  `GlobalFilterPlacement`. The three deleted placement enums reached the DOM nowhere at all —
  the components wrote only `data-slot` constants and read the enums purely as mount booleans,
  which is the class this whole change removes.

- **When removing an option, grep for the behaviour it produced, not only for its name.** The
  stale text that survives a rename sweep is the text that describes an old default without
  naming the option: `pagination/index.mdx` carried a whole "Page size selector" section saying
  "set `items` and a selector renders in the toolbar" — true until this change, and invisible to
  a grep for `pageSizer`. Two more docs pages and four package docblocks had the same shape,
  including `create-trigger.tsx` justifying itself with "it sits directly above the draft row",
  an adjacency that was a fact while the toolbar auto-mounted the trigger and is a layout's
  choice now. Do a second sweep for the claims, not the identifiers.
- **`DefaultLayout` mounts no page sizer, and that is the one behaviour this change did not
  preserve.** The old default mounted one in the toolbar when the author **wrote**
  `pagination.items` — a read of the authored config (`paginationCfg?.items !== undefined`).
  `ResolvedGridOptions.items` falls back to a default list under any paged pagination, so a
  preset gating on it would mount a selector on **every** paginated grid: louder than the old
  default, not a restoration. Restoring it exactly needs a resolved "the author named a list"
  flag, which is a mount decision back in the config — the thing being removed. So the sizer is
  a composition choice: `<DataGrid.Toolbar start={<DataGrid.PageSizer />} />`, or
  `BottomBarLayout` for the sizer beside the page controls. A preset test asserts the split, so
  a later "helpful" addition to `DefaultLayout` fails rather than going quiet.

  They were never statements about the grid: they were arguments to the default `<Toolbar>` and
  the default layout that had leaked into the table's config, and the controls proved it —
  `VisibilityTrigger`, `SortMenuTrigger` and `GlobalFilterInput` read none of them, then or now.
  What made it worth a breaking change is the rate of growth, not the count: every new
  arrangement cost a new enum value or a new option, and the last one added
  (`globalFiltering.toolbar.placement`, `1744b71c`) bought a bar that is one line of JSX.

  **This was not a bundle-size fix and must not be argued as one.** The flags cost zero bytes —
  `Toolbar` imported its controls statically, and a runtime `&&` inside JSX is not something a
  bundler removes. See the `./index` note below for what the bytes actually turned on.

- **`filtering.variant` is gone because it was one enum on two axes.** `'panel'` answered
  "is there a filter in the header at all" and `'inline'` / `'popover'` answered "what does it
  look like", which is why filters in the header **and** in a panel was inexpressible — there
  was no value for it. Both axes are now `<DataGrid.HeaderCell>`'s render function, which hands
  back `filter` and `filterPopover` beside `label` / `sortTrigger` / `menu` / `resizer`: not
  rendering `filter` is what takes it out of the header. Rendering it while
  `<DataGrid.FilterPanel />` is also mounted gives both, and the two write one `columnFilters`
  value.

  Do not "simplify" this into a runtime registration where the panel announces itself and the
  header reacts. `HeaderCell` is the panel's **sibling**, not its descendant, so that needs an
  effect and a second pass: filters render in the header on the first frame and vanish on the
  second, behaviour starts depending on whether the layout put the panel before or after
  `<DataGrid.Table />`, and SSR output stops matching the client. The composition has none of
  that, which is why it won.
