---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': patch
---

Name every control and header cell the grid renders without a visible label

Four of the grid's own elements reached the accessibility tree anonymous, in **both** UI kits —
axe reported `label` (critical) and `empty-table-header` on every grid that had them:

- **Column filters.** The control carried a placeholder and nothing else, and a placeholder is not
  an accessible name: it disappears on the first keystroke.
- **The draft creating row**, and **a cell being edited in place.** Both render a bare control,
  because the column header above it is the label a sighted user reads. `FieldState.label` is set
  only in the modal form, where a kit composite draws a visible `<label>` from it.
- **The `__expand__` and `__actions__` system columns**, whose `<th>` holds chevrons or a menu and
  no text at all — and the `__selection__` one under `selection: { multi: false }`, where there is
  no select-all checkbox to name it.

All four are named now. Where the grid renders the control itself it takes an `aria-label`; where
the control is the kit's own component it gets a visually hidden `<label htmlFor>` bound by
`FieldState.id`, which every kit component honours. The text comes from the dictionary or from the
column's own header, never from a literal — `messages.filtering.placeholder` names a filter, and
three new keys name the system columns: `selection.columnHeader`, `expanding.columnHeader` and
`rowActions.columnHeader`.

Additive, so nothing has to change. A dictionary that replaces `selection` / `expanding` /
`rowActions` wholesale rather than per entry will want the new key; `PartialGridMessages` types any
subset, so the usual per-entry override is unaffected.

The shadcn kit's page-size `Select` was also unnamed (`button-name`): the text beside it is a
`<span>`, not a `<label>`, so it named nothing. It now carries the same `aria-label` the heroui
kit's already did.

The heroui kit's sort and column-visibility triggers put a real `<Button>` inside a
`Popover.Trigger`, which renders a `div[role="button"]` of its own — a button inside a button
(`nested-interactive`, serious). The trigger is now the button, with the kit's own styling applied
through `buttonVariants`, which is HeroUI's documented way to put a component's styles on an
element that is not that component. The `Dropdown` form of the visibility menu is unchanged: that
one follows react-aria's menu-trigger pattern and takes the button itself.

`apps/docs/e2e/packages/data-grid/a11y/names.spec.ts` runs axe over four examples in both kits for
exactly these rules, so a regression fails in a browser rather than in a screen reader.
