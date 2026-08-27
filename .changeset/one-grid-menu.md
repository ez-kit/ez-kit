---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Collapse the duplicated menu and row-action components into one of each. **Breaking** for
anyone shipping a custom UI kit.

**Three slots removed, one added.** `ColumnMenu`, `RowActionsMenu` and `CreatingActionsCell`
are gone; `core.Menu` replaces the first two. The contract is now 38 injectable components
instead of 40.

- `core.Menu` (`GridMenuProps`) renders both the column header menu and the row actions menu.
  It takes `variant` (`GridMenuVariant.Column | .Row` — the only thing that differed), plus
  `sections: GridMenuSection[]` of `GridMenuItem`s. Each item names its glyph semantically via
  `GridMenuIcon`, so a kit keeps one icon map for every menu instead of one per menu.
- `row-actions.ActionsCell` now covers the creating row too. `ActionsCellProps` became a
  discriminated union on `RowActionsMode` (`Idle` / `Editing` / `Creating`), so each state
  carries exactly the callbacks it can use. `Creating` takes `canCancel` where the old
  `CreatingActionsCell` took `isPinRow`.
- The wording and grouping of the column menu ("Asc", "Pin Left", the "Sorting" / "Pin"
  headings) moved into `buildColumnMenuSections`, exported alongside `ColumnActionId` — it is
  content, identical across kits, and it previously lived in each kit separately.

The heroui kit now renders the sections as real `Dropdown.Section`s with a `Header`, so its
column menu carries the same "Sorting" / "Pin" headings shadcn always had — previously it
flattened everything into one list. Each section also gets a `group` role named by its heading.

Removed types: `ColumnMenuProps`, `ColumnMenuSections`, `ColPinSection`, `ColSortSection`,
`ColVisibilitySection`, `RowActionsMenuProps`, `RowActionItem`, `CreatingActionsCellProps`.
