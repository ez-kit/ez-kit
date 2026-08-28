---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

One name per concept, props on every compound member, and a read-only column that stays read-only

**`editing: false` is now honoured in `editing.mode: 'cell'`.** It was bypassed there — the render
guard short-circuited on the mode and the double-click handler was attached unconditionally — so a
column that opted out still became an input on double-click and its value reached `onSave`. Row and
modal mode always honoured it, which meant changing `mode` silently changed the permission model.
`table.editing.startCell()` now returns early for such a column too, so the programmatic path
agrees with the rendered one.

**`deferredApply` → `draft`.** One feature answered to two words depending on where you touched it:
the option was `deferredApply`, while everything it turns on is `draft` — `table.draft`,
`initialState.draft`, `DraftApi`, `QueryDraft`, `DraftAxis`, `<DataGrid.DraftBar />`,
`GridDraftComponents`. It also takes an object form now (`DraftConfig`), so `draft: { enabled: false }`
can switch off a `draft` inherited from a defaults layer — the escape hatch every other feature has.

**`sorting.undefined` no longer accepts TanStack's raw `-1` / `1`.** Two positions had four
spellings, and the numeric pair was a raw pass-through of TanStack's vocabulary on a grid-level
option. Write `'first'` / `'last'` (or `false`).

**`RowActionItem.danger` / `GridMenuItem.danger` → `destructive`,** matching
`BadgeVariant.Destructive`. One word for the "this action destroys something" semantic, instead of
`danger` on a menu entry and `destructive` on a badge.

**Every compound member now takes props.** `PageSizer`, `DraftBar`, `CreatingModal`,
`EditingModal`, `LoadingBody`, `EmptyStateRow` and `NoResultsRow` took none at all — there was no
way to restyle or reword them short of replacing the kit component globally. All seven now accept
`children` (a node, or a render function receiving that slot's model) and export their
`DataGrid<Name>Props` / `DataGrid<Name>RenderArgs` types. The two modals hand you `form` — the field
set the columns already describe — so a custom dialog does not have to rebuild the inputs; the three
row-level fallbacks render their children inside the kit's `<Tbody><Tr><Td colSpan>` scaffold, so
the table markup stays valid.

**`<DataGrid.Header stickyHeader>` → `<DataGrid.Header sticky>`.** The component already says
"header", the way the neighbouring local overrides drop the prefix (`ActiveFiltersBar position`,
`GlobalFilterInput placeholder`). The `layout.stickyHeader` option is unchanged.

**Kit stylesheets moved from `./global.css` to `./styles.css`,** matching
`@ez-kit/data-grid-react/styles.css`. Update the import:
`import '@ez-kit/data-grid-shadcn/styles.css'`.

Also: `<DataGrid.CreateTrigger>`'s JSDoc promised an `asChild` prop that never existed; "footer" now
means only the `<tfoot>` summary row, with the page controls called the pagination bar throughout;
the shadcn kit drops two unused runtime dependencies (`input-otp`, `tw-animate-css`); and the docs
gained the six compound members (`HeaderRow`, `HeaderCell`, `Cell`, `Footer`, `DraftBar`,
`SortTrigger`/`VisibilityTrigger`) that appeared on no page.
