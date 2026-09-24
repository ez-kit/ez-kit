---
'@ez-kit/data-grid-react': minor
---

A keyboard focus model for kits that bring none

Crossing a shadcn grid cost **10 to 14 `Tab` presses, growing with the row count** — the user
walked every sort trigger, checkbox and menu button in turn — and the arrow keys did nothing at
all. `@ez-kit/data-grid-react` now carries the focus model an ARIA grid is supposed to have:

- the whole grid is **one tab stop**, and nothing inside a cell is in the tab order
- arrows move between cells, `Home` / `End` to the ends of the row, `Ctrl` with them to the ends
  of the grid, `PageUp` / `PageDown` by ten rows
- `Enter` or `F2` hands the caret to the cell's own controls, `Escape` brings it back to the cell
- the cells carry `grid` / `row` / `gridcell` / `columnheader`

**It is opt-in per kit, through `createDataGrid({ keyboardNavigation: true })`, and deliberately
not a grid option.** HeroUI's table is React Aria's, which brings a roving focus manager already;
a second one there would fight it for the arrow keys. A `keyboard: false` in the grid config
would therefore change nothing at all in that kit — an option that type-checks clean and silently
does nothing, which is the defect class `REQUIRED_FEATURE` already warns about for unregistered
features. So the switch sits beside `components` and `features`, where it reads as what it is: a
statement about what the bundle brings. The shadcn kit sets it; the heroui kit does not. A
consumer composing their own bundle decides for themselves, which is also the way to turn the
model off. A per-grid switch stays addable later without a break.

Nothing changes for a bundle that says nothing: no roles, no `tabIndex`, no key handler, and the
same DOM as before.

Two things the model must not take, both pinned by tests: `Alt+Arrow`, which moves a column or a
row, and anything raised while a cell is open for editing — `cell.tsx` runs the editor's own
`Enter` / `Escape` pair. Inside a cell's controls the model takes only `Escape`.

The model is imperative on purpose. Cells render a static `tabIndex={-1}` and the single stop is
moved by writing one attribute, so an arrow press re-renders nothing; holding the address in React
state would re-render every cell of the grid on every keystroke. Addressing is by document
position rather than a row/column index pair, because `ThProps` / `TdProps` carry no
`RefAttributes`, because the three row groups render in visual order anyway, and because a
virtualized grid has no element for an off-screen row to index.

`apps/docs/e2e/packages/data-grid/a11y/keyboard-navigation.spec.ts` drives it in a real browser
for both kits, asserting behaviour rather than which library produced it.
