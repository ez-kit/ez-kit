# @ez-kit/docs

## 0.1.1

### Patch Changes

- Updated dependencies [c35206c]
- Updated dependencies [ce829bb]
- Updated dependencies [cd20119]
- Updated dependencies [e047016]
- Updated dependencies [7386f53]
- Updated dependencies [c35206c]
- Updated dependencies [d2bac42]
- Updated dependencies [f3647db]
- Updated dependencies [755b7d4]
- Updated dependencies [da30181]
- Updated dependencies [c35206c]
  - @ez-kit/data-grid-react@0.9.0
  - @ez-kit/data-grid-heroui@0.9.0
  - @ez-kit/data-grid-core@0.8.0
  - @ez-kit/data-grid-shadcn@0.2.0

## 0.1.0

### Minor Changes

- c5dcdc5: Column pinning speaks `start` / `end` instead of `left` / `right`, everywhere.

  TanStack Table v9 removed physical `left` / `right` from `Column.getStart` / `getAfter` / `pin()`
  entirely, so this is not a preference: a pinned column is now named by the edge it sticks to in the
  reading direction, and it flips under RTL the way `align` and `Toolbar.start` / `Toolbar.end`
  already do. **Row pinning is unchanged and stays `top` / `bottom`** — a vertical axis has no
  logical names and nothing about it flips.

  It is one idea and **eight separate things to change in your code**. Each is listed because the
  first five fail differently from the last three, and two of them fail silently.
  1. **The column option value.** `pinning: 'left'`, `pinning: { side: 'left' }`,
     `pinning: { initialSide: 'right' }` are `'start'` / `'end'`, and `ColumnPinSide.Left` / `.Right`
     are `.Start` / `.End`. This is the one most consumers hit, because it is in the column
     definitions.
  2. **`initialState.columnPinning` and `state.columnPinning` are `{ start, end }`**, upstream's
     shape, not `{ left, right }`. **This one fails silently**: a stale key is accepted and ignored,
     so `initialState={{ columnPinning: { right: ['name'] } }}` merges to "nothing pinned" rather
     than throwing.
  3. **`GridMenuIcon.PinLeft` / `.PinRight` are `.PinStart` / `.PinEnd`.** These are required keys of
     the icon map, so supplying your own is a compile error rather than a silent one — the only part
     of this rename that cannot fail open.
  4. **`messages.columnMenu.pinLeft` / `.pinRight` are `.pinStart` / `.pinEnd`.** A translation
     override keyed on the old name reverts to English; whether your compiler catches it depends on
     how exactly your `messages` object is typed, so treat it as silent. The English defaults are
     deliberately unchanged — they still read "Pin Left" / "Pin Right", because the key names the
     axis and the wording names what an LTR reader sees, exactly as `moveStart` reads "Move left".
  5. **`ColumnActionId.PinLeft` / `.PinRight` are `.PinStart` / `.PinEnd`, and so are the ids they
     carry** — `'pin-left'` / `'pin-right'` are now `'pin-start'` / `'pin-end'`. Those values reach
     the DOM as menu-item ids, so a menu customisation or a test selector keyed on one stops
     matching. Renamed rather than left alone because `PinStart: 'pin-left'` would have been the only
     member on that object whose value contradicts its key, two lines from `MoveStart: 'move-start'`.

  If you style the grid yourself — or you ran `npx shadcn add` and copied the kit into your project —
  three more: 6. **`data-pinned` and `data-pin-shadow` carry `start` / `end`** on a column. (On a row,
  `data-pinned` is still `top` / `bottom`.) 7. **`--dg-pin-left` / `--dg-pin-right` are `--dg-pin-start` / `--dg-pin-end`, and
  `--dg-pin-{left,right}-shadow` are `--dg-pin-{start,end}-shadow`.** A copied `styles.css` keeps
  your old rules against the new variable names, and your own overrides stop applying — with no
  error, because a CSS custom property that no longer matches just falls back. 8. **Pinned cells are positioned with `inset-inline-start` / `inset-inline-end`**, not `left` /
  `right`, so an override written against the physical properties no longer wins the way you
  expect.

  Under the hood the measurement went logical with the names, which is what makes RTL actually work
  rather than merely read correctly: the pin-shadow offsets are measured from the overlay's own
  inline edges and applied as inline insets, and the scroll-shadow booleans are computed from
  `Math.abs(scrollLeft)`, because `scrollLeft` is signed under RTL. `box-shadow` has no logical form,
  so each kit restates the offset's sign under `[dir='rtl']`.

  Note that the grid's `direction: 'rtl'` option tells the grid which way it is laid out; it does not
  lay the page out. Set `dir='rtl'` on a wrapping element as well, as you would for any RTL content.

### Patch Changes

- Updated dependencies [c5dcdc5]
- Updated dependencies [c5dcdc5]
- Updated dependencies [c5dcdc5]
- Updated dependencies [c5dcdc5]
  - @ez-kit/data-grid-core@0.7.0
  - @ez-kit/data-grid-react@0.8.0
  - @ez-kit/data-grid-heroui@0.8.0
  - @ez-kit/data-grid-shadcn@0.2.0

## 0.0.12

### Patch Changes

- Updated dependencies [fa3470d]
- Updated dependencies [f5f9ca8]
- Updated dependencies [ec55356]
- Updated dependencies [4f772fe]
- Updated dependencies [ec55356]
- Updated dependencies [ec55356]
  - @ez-kit/data-grid-core@0.6.0
  - @ez-kit/data-grid-react@0.7.0
  - @ez-kit/data-grid-heroui@0.7.0
  - @ez-kit/zu-store@1.0.0
  - @ez-kit/va-store@1.0.0
  - @ez-kit/data-grid-shadcn@0.2.0

## 0.0.11

### Patch Changes

- Updated dependencies [f41b16d]
- Updated dependencies [f41b16d]
- Updated dependencies [f41b16d]
  - @ez-kit/data-grid-react@0.6.0
  - @ez-kit/data-grid-heroui@0.6.0
  - @ez-kit/data-grid-shadcn@0.2.0

## 0.0.10

### Patch Changes

- Updated dependencies [864da28]
- Updated dependencies [864da28]
- Updated dependencies [f12aac9]
  - @ez-kit/data-grid-core@0.5.0
  - @ez-kit/data-grid-react@0.5.0
  - @ez-kit/form-react@0.3.1
  - @ez-kit/data-grid-heroui@0.5.0
  - @ez-kit/form-heroui@0.4.0
  - @ez-kit/data-grid-shadcn@0.2.0
  - @ez-kit/form-shadcn@0.3.2

## 0.0.9

### Patch Changes

- Updated dependencies [a85577e]
- Updated dependencies [9a95f22]
  - @ez-kit/data-grid-core@0.4.0
  - @ez-kit/data-grid-react@0.4.0
  - @ez-kit/data-grid-heroui@0.4.0
  - @ez-kit/data-grid-shadcn@0.2.0

## 0.0.8

### Patch Changes

- 71a834f: docs: browser specs for pagination

  `e2e/packages/data-grid/pagination/` — the footer's three display axes (`links`, `edges`,
  `label`) and the page-size selector's two placements, written once and run against both kits.
  Every press reads the rows back, so a control that renders but moves nothing fails.

- 71a834f: data-grid: one name for the element that scrolls — `data-scrollport`

  Each kit builds its scrollport differently: shadcn scrolls the shared `table-scroll` div,
  HeroUI its own nested `table-scroll-container`, a virtualized grid a third element again — and
  the horizontal and vertical scrollports are not always the same element. Nothing named the
  winner, so CSS, tests and consumers had to guess per kit, and the obvious guess is wrong:
  shadcn's `table-container` reports overflowing metrics while its computed `overflow` is
  `visible`, so it scrolls nothing.

  The react layer already resolves both axes — for pin shadows and for infinite-scroll edge
  detection — and now stamps what it resolved: `data-scrollport="x"`, `"y"`, or `"x y"` when one
  element owns both. Select with `[data-scrollport~='x']`. Existing `data-slot` names are
  unchanged.

- 71a834f: data-grid: a selected row says so, and the selection bar has one name

  **`data-row-selected="true"` on a selected row.** Nothing marked selection on the `<tr>`, so a
  selected row was indistinguishable from any other in the DOM — and invisible on screen: the
  shadcn primitive's `data-[state=selected]:bg-muted` had no attribute to match, so picking a row
  changed nothing but the checkbox. Both kits' stylesheets now paint `[data-row-selected='true']`,
  pinned cells included.

  The row derives the flag through `row.getIsSelected()` (a parent counts as selected through its
  children) behind a boolean selector, so only the row whose selectedness flipped re-renders —
  the body still does not subscribe to `rowSelection`.

  The name avoids `data-selected` deliberately: React Aria's `Row` writes that attribute itself,
  as a literal after spreading incoming props, from a selection manager the grid does not drive —
  so anything passed down is erased in any RAC-based kit, heroui included.

  **`data-slot="selection-bar"` in both kits.** heroui's floating variant delegated to its generic
  `ActionBar` and came out as `data-slot="action-bar"`, while shadcn — and heroui's own inline
  variant — emitted `selection-bar`. The floating bar now carries the same name, with
  `data-state="open"` telling whether it is up (shadcn keeps it mounted and faded; heroui
  unmounts it). The inner `action-bar-*` parts keep their names.

- 71a834f: Fix the controlled-expanding example's row ids.

  It built its expanded map from the row index (`'0'`…`'3'`) while the grid keys a row by its `id`
  field when the data has one (`'1'`…`'4'`). "Expand all" therefore opened three of the four rows,
  left the last one shut, and wrote one id that matched no row — on the page that teaches a reader
  how to drive `state.expanded` from outside the grid.

- 71a834f: docs(data-grid): a live example for `chips: 'below'`

  The sentence documenting the chips strip's second position had no example under it, so the only
  way to see what `'below'` does was to build it. It now sits beside the auto-mount one, same grid
  and same filters, differing only in which side of the table the strip lands on.

- 71a834f: heroui: keep `data-row-id` on body rows

  The `Tr` adapter consumed the attribute — it read the value into React Aria's collection `id`
  and then dropped it — so `[data-row-id]`, documented as part of the react layer's row contract,
  selected nothing under heroui while working under shadcn. It is now passed through alongside
  the `id`; React Aria's own `data-key` is unaffected.

- 71a834f: data-grid-heroui: the toolbar keeps its slot name, and `data-has-value` is spelled once

  **`data-slot="toolbar"` reaches the DOM.** The React layer passes the attribute to whatever
  `Toolbar` a kit supplies; this kit's destructured `children` / `start` / `end` and dropped the
  rest, so the toolbar region simply had no name in heroui — `[data-slot="toolbar"]` matched
  nothing, and `filtering: { panel: 'toolbar' }` could not be told apart from the default
  placement by anything but the eye. Same omission `Tr` had with `data-row-id`, same fix: spread
  the remaining props. `role="toolbar"` stays.

  **`data-has-value` on a filter-panel chip is present or absent, never `"false"`.** The chip
  wrote `hasValue ? 'true' : 'false'` where the shadcn one writes `hasValue || undefined`, so one
  flag had two spellings and every selector over it had to know which kit it was looking at. It
  now matches shadcn. A stylesheet or test keyed on `[data-has-value="false"]` must switch to
  `:not([data-has-value])`.

  Both were found by the new browser specs for filtering, which assert the layer's `data-*`
  contract against a real layout rather than against jsdom.

- 71a834f: data-grid-shadcn: the pagination footer is built from buttons, and its label has a name

  **The page controls are real `<button>`s.** The block built them from the vendored
  `PaginationLink`, which is upstream shadcn's href-driven control: an `<a>`. This grid pages by
  `onClick` and passes no href, and an `<a>` without one is not focusable and computes to the
  generic role — so the footer could only be operated with a mouse, announced nothing to a screen
  reader, and was "disabled" only as `aria-disabled` plus `pointer-events: none`, which no
  assistive technology reads off a generic element. The block now renders `Button` directly, with
  the native `disabled` attribute; `Button`'s base class already carries
  `disabled:pointer-events-none disabled:opacity-50`, so nothing looks different. Two
  consequences: prev/next take the `pagination-previous` / `pagination-next` slots heroui already
  uses (they were both `pagination-link`), and `data-active` is present-or-absent rather than
  `"false"` on every inactive link. `aria-current="page"` is unchanged.

  The vendored `components/ui/pagination.tsx` is untouched — `Pagination`, `Content`, `Item` and
  `Ellipsis` still come from it. A selector keyed on `a[data-slot="pagination-link"]` or on
  `[data-active="false"]` needs updating.

  **`data-slot="pagination-summary"` on the footer label.** heroui's footer text is a
  `Pagination.Summary` and reaches the DOM with that slot name; this kit's was an unnamed
  `<span>`, so the one piece of the footer a reader actually reads had to be found by position
  inside the nav. It now uses heroui's name.

  Both were found by the new browser specs for pagination, which drive the footer in both kits
  through one set of assertions.

- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
- Updated dependencies [71a834f]
  - @ez-kit/data-grid-core@0.3.0
  - @ez-kit/data-grid-react@0.3.0
  - @ez-kit/data-grid-heroui@0.3.0
  - @ez-kit/form-shadcn@0.3.1
  - @ez-kit/data-grid-shadcn@0.2.0

## 0.0.7

### Patch Changes

- Updated dependencies [3d5b53c]
- Updated dependencies [ff74e84]
  - @ez-kit/zu-store@0.8.0
  - @ez-kit/va-store@0.4.0

## 0.0.6

### Patch Changes

- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
- Updated dependencies [b0580ea]
  - @ez-kit/zu-store@0.7.0
  - @ez-kit/va-store@0.3.0

## 0.0.5

### Patch Changes

- Updated dependencies [ed0250e]
- Updated dependencies [9707040]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [fe267fa]
- Updated dependencies [fe267fa]
- Updated dependencies [ed0250e]
- Updated dependencies [fe267fa]
- Updated dependencies [fe267fa]
- Updated dependencies [7131953]
- Updated dependencies [fe267fa]
- Updated dependencies [c73fef9]
- Updated dependencies [c73fef9]
- Updated dependencies [ed0250e]
- Updated dependencies [f92d88b]
- Updated dependencies [a132c57]
- Updated dependencies [a132c57]
- Updated dependencies [2f7c40d]
- Updated dependencies [7c3ca6a]
- Updated dependencies [d709ff3]
- Updated dependencies [a132c57]
- Updated dependencies [d709ff3]
- Updated dependencies [d709ff3]
- Updated dependencies [fe267fa]
- Updated dependencies [d709ff3]
- Updated dependencies [d709ff3]
- Updated dependencies [fe267fa]
- Updated dependencies [d709ff3]
- Updated dependencies [a132c57]
- Updated dependencies [fe267fa]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [1f19a95]
- Updated dependencies [86e6363]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [5a6bf03]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [fd7c480]
- Updated dependencies [2264a8d]
- Updated dependencies [ed0250e]
- Updated dependencies [af8d6a1]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [1f068e5]
- Updated dependencies [1f068e5]
- Updated dependencies [9707040]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [8c384e1]
- Updated dependencies [ed0250e]
- Updated dependencies [d825988]
- Updated dependencies [abaa123]
- Updated dependencies [1f068e5]
- Updated dependencies [79a6f4c]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [127139c]
- Updated dependencies [fd7c480]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [e93fa7d]
- Updated dependencies [ed0250e]
- Updated dependencies [a1bfede]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [fd7c480]
- Updated dependencies [ed0250e]
- Updated dependencies [ed0250e]
- Updated dependencies [a166bc0]
- Updated dependencies [1f068e5]
- Updated dependencies [ed0250e]
  - @ez-kit/data-grid-core@0.2.0
  - @ez-kit/data-grid-react@0.2.0
  - @ez-kit/data-grid-shadcn@0.2.0
  - @ez-kit/data-grid-heroui@0.2.0
  - @ez-kit/zu-store@0.6.0
  - @ez-kit/va-store@0.2.0
  - @ez-kit/form-core@0.3.0
  - @ez-kit/form-react@0.3.0
  - @ez-kit/form-heroui@0.3.0
  - @ez-kit/form-shadcn@0.3.0

## 0.0.4

### Patch Changes

- Updated dependencies [a7fbfac]
  - @ez-kit/va-store@0.1.0
  - @ez-kit/zu-store@0.5.1

## 0.0.3

### Patch Changes

- Updated dependencies [904d9df]
- Updated dependencies [77390a1]
- Updated dependencies [8b845e0]
- Updated dependencies [c76b87b]
- Updated dependencies [6cf77ea]
- Updated dependencies [03073ed]
- Updated dependencies [a705688]
  - @ez-kit/data-grid-react@0.1.1
  - @ez-kit/form-react@0.2.0
  - @ez-kit/form-shadcn@0.2.0
  - @ez-kit/form-heroui@0.2.0
  - @ez-kit/data-grid-heroui@0.1.1
  - @ez-kit/twc@0.1.0
  - @ez-kit/data-grid-shadcn@0.1.1

## 0.0.2

### Patch Changes

- Updated dependencies [005a133]
- Updated dependencies [f81d1af]
- Updated dependencies [98e9b0c]
- Updated dependencies [24bf599]
- Updated dependencies [1edda75]
- Updated dependencies [6c179f3]
- Updated dependencies [803b41b]
- Updated dependencies [146122e]
- Updated dependencies [a449e93]
- Updated dependencies [1edda75]
  - @ez-kit/data-grid-react@0.1.0
  - @ez-kit/data-grid-core@0.1.0
  - @ez-kit/data-grid-shadcn@0.1.0
  - @ez-kit/data-grid-heroui@0.1.0

## 0.0.1

### Patch Changes

- Updated dependencies [6bd6980]
- Updated dependencies
  - @ez-kit/zu-store@0.4.0
