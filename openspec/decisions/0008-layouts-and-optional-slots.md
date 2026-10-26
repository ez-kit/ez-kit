# 0008. Optional shell slots, `core.Layout` and the layout presets

- Status: Accepted
- Recorded: 2026-10-26 (moved from `AGENTS.md`; the decision itself predates this record)
- Related: [0006-composition-over-placement](./0006-composition-over-placement.md), [0009-single-action-bar](./0009-single-action-bar.md)

## Decision

**Optional shell slots, `core.Layout` and the presets.** `core.TableWrapper` / `TableScroll` / `Layout` are `FEATURE_OPTIONAL_COMPONENTS`: spread every prop, land `ref` on the element that actually scrolls — no DOM sniffing. The body is `children ?? core.Layout ?? <DataGrid.Table />`; kits bind `DefaultLayout` in `data-grid.tsx`, never `index.ts`. Presets place `ActionBar` by variant through `useActionBarSlots` (floating last, inline between toolbar and table) — restore neither earlier form. A preset mounts a control only when the grid has no other way into or out of that feature (`presets.test.tsx`). A layout is named for the API member that distinguishes it or the screen it belongs to — never a tier word.

## Context, rationale and rejected alternatives

- **The grid shell's two boxes are optional slots, and `ref` is the scrollport declaration.**
  `core.TableWrapper` / `core.TableScroll` are the first members of `FEATURE_OPTIONAL_COMPONENTS`,
  a tier beside `FEATURE_COMPONENTS` that a feature _accepts_ without requiring. They stay out of
  `ComponentsFor`, which is what `FullGridComponents` makes mandatory, so adding one is additive:
  an external kit that wrote `satisfies FullGridComponents` keeps compiling and keeps its current
  rendering. A key belongs in that tier only when the package has a correct answer without it —
  here, a plain `div`. This is the pattern for any post-1.0 slot with a sane default; it does not
  reopen the `core` primitives question, which is about slots that have none.

  **`core.Layout` is the third member, and it is what replaced the removed placement options.**
  The grid's body resolves as `children ?? core.Layout ?? <DataGrid.Table />`, so the bare
  `@ez-kit/data-grid-react` has no rich default and, deliberately, no import of one: a grid with
  neither children nor a registered layout is a table and nothing else, which is the only
  arrangement this package can be right about once composition is stated in JSX. The familiar
  toolbar / table / pagination shell is a **kit** decision — each kit binds `DefaultLayout` from
  `@ez-kit/data-grid-react`'s `layouts/`, exactly as its prebuilt `DataGrid` binds
  `allDataGridFeatures`, and with the same caveat: the binding lives in the kit's
  `data-grid.tsx`, never in `index.ts`, or every grid composed through `createDataGrid` inherits
  it silently. So quick start is unchanged and `createDataGrid` still pays only for what it names.

  The presets (`DefaultLayout`, `BottomBarLayout`, `FilterPanelLayout`,
  `PopoverFiltersLayout`) live in the shared react package because they are pure composition with
  no authored class — the no-styles rule is untouched, and one set serves both kits. Adding more,
  in a kit or in an application, is the intended way to get a new arrangement; adding an option is
  not.

  **A preset places `ActionBar` by its variant; a layout of one's own places it where it writes
  it.** The rule the placement options broke is narrower than "a preset never reads config": what
  is forbidden is an option that exists **only** to say where something goes. A preset may read a
  mode the config already carries for behaviour, to put an enabled feature where that kind of
  element belongs — `useToolbarControls` already reads `creating.mode` to decide whether
  `CreateTrigger` mounts at all. So all four presets take the bar from `useActionBarSlots`
  (`layouts/action-bar-slots.tsx`): `floating`, the default, goes **last**, because both kits
  position that bar out of a zero-height sticky anchor that has to follow the rows it overlays, and
  coming last keeps it out of the tab order until there is something to act on; `inline` goes **between the toolbar and the table** —
  in `FilterPanelLayout` after the chips, which belong to the toolbar that writes them — because an
  in-flow strip below the pagination is out of sight of the rows it acts on. One keyed element in
  one of two slots, so there is never a second bar and a runtime flip moves it rather than
  remounting it. A grid whose body is `children` or its own `core.Layout` gets no say from the
  variant at all.

  This reverses an earlier revision of this entry, which made the presets write the bar last
  whatever the variant and called the inline strip below the table an accepted cost. That shipped
  in 0.9.0 and is reversed, as a breaking change, in the minor after 0.10.0. Do not restore it: a preset that renders an
  enabled feature wrongly is not neutral, it is wrong. Do not restore the `GridShell` wrapper that
  came before it either — it did the same thing but took the order of children away from each
  preset, where the slots leave it in every preset's JSX. The variant is still what the bar _looks
  like_ too — stamped `data-variant` and branched on by both kits. Moving the variant onto the
  component as a prop was considered and not taken — it is the more consistent answer by the
  surviving-enum rule above, and it was judged not worth the config break here.

  The contract is: **spread every prop you receive** (`data-slot` above all — the structural
  stylesheet targets the slot, not the element), and **land `ref` on the element that actually
  scrolls**. That `ref` _is_ the declaration: it is what the pin shadows read, what infinite
  scroll measures, what the row virtualizer drives, and what gets stamped `data-scrollport`.
  It replaced `resolveScrollElement` / `resolveVerticalScrollElement` and a `getComputedStyle`
  overflow probe, which existed because the shared div stayed the scrollport whatever a kit
  nested inside it — HeroUI then spent ~65 lines of stylesheet relocating the bound back out, and
  #103 and #105 both came from that arrangement. Do not reintroduce DOM sniffing for the
  scrollport: a kit whose scroller is not the shared div registers the slot.
  Note the slot only works when the kit's scroller is at or above the shell's box in its own
  tree. HeroUI's is below its `.table-root`, which is why the kit hoists `Table.Root` +
  `Table.ScrollContainer` into `TableScroll` and its `Table` slot renders `Table.Content` — so
  `data-slot='table'` lands on the real `<table>` and the root takes `data-slot='table-root'`.

- **A preset mounts a feature's control only when the grid has no other way into — or back out
  of — that feature.** That is the one rule `useToolbarControls` encodes, and it is why the presets
  carry `GlobalFilterInput`, `VisibilityTrigger` (the only way back to a hidden column) and
  `CreateTrigger` (except under `CreatingMode.PinRow`, whose pinned form is already a way in) — and
  carry neither `SortMenuTrigger` (the header click sorts) nor `ClearFiltersButton` (each filter
  clears in its own input). Both of those were opt-in before the placement options went; gating
  every control on "the feature is on" turned them on in 0.9.0 by accident, and that was reverted.
  Two alternatives were considered and **rejected**: a `sorting: { menu: true }` flag is
  `sorting.toolbar` under a new name, i.e. the placement option this section forbids; and mounting
  the builder iff `sorting.multi` is a mount decision inferred from config — the `pagination.items`
  gate `DefaultLayout` refused — on a value whose absence does not even mean "off" (TanStack enables
  Shift-click multi-sort by default). `presets.test.tsx` pins the split, so a new control added to
  `useToolbarEnd` has to pass the rule rather than slip in.

- **A layout is named for the API member that distinguishes it, or for the screen it belongs to —
  never for a tier.** `BottomBarLayout` mounts `<DataGrid.BottomBar/>`, `PopoverFiltersLayout`
  renders `filterPopover`, `FilterPanelLayout` puts `<DataGrid.FilterPanel/>` in the toolbar; the
  docs' own example layouts are `OrdersLayout` and `CrudLayout`, after the screens they lay out.
  `DefaultLayout` is the exception that proves the rule: it names a fact about binding — the one
  both kits register as `core.Layout` — not a quality.

  Two names were fixed by this and both failure modes are worth recognising. `ProductionLayout`
  was a **tier** word: every preset is usable in production, so the name claimed a hierarchy that
  does not exist, and the page it was named after (`production.mdx`) already called the component
  `OrdersLayout` in its own prose. So do not reach for `Production`, `Advanced`, `Basic`,
  `Simple` or `Pro`. `SearchFiltersActionsLayout` was an **enumeration that did not
  distinguish**: `useToolbarStart` / `useToolbarEnd` put the same search box and the same trailing
  controls in all four presets, so two of the three things it listed were true of `DefaultLayout`
  too, while the filter panel — the only real difference — went unnamed. Before naming a layout
  after what it contains, diff it against `DefaultLayout` and name what the diff turns up.

  Neither rename cost anything: both layouts were unreleased, `ProductionLayout` lives only in
  `apps/docs`, and the presets' changeset (`composition-over-placement.md`) was still pending, so
  it was edited in place rather than a second changeset written. That is luck about timing, not a
  reason to defer the next one — a preset name reaches `npx shadcn add` payloads and 1 600
  occurrences of docs the moment it ships.
