---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
'@ez-kit/docs': minor
---

Column pinning speaks `start` / `end` instead of `left` / `right`, everywhere.

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
three more:

6. **`data-pinned` and `data-pin-shadow` carry `start` / `end`** on a column. (On a row,
   `data-pinned` is still `top` / `bottom`.)
7. **`--dg-pin-left` / `--dg-pin-right` are `--dg-pin-start` / `--dg-pin-end`, and
   `--dg-pin-{left,right}-shadow` are `--dg-pin-{start,end}-shadow`.** A copied `styles.css` keeps
   your old rules against the new variable names, and your own overrides stop applying — with no
   error, because a CSS custom property that no longer matches just falls back.
8. **Pinned cells are positioned with `inset-inline-start` / `inset-inline-end`**, not `left` /
   `right`, so an override written against the physical properties no longer wins the way you
   expect.

Under the hood the measurement went logical with the names, which is what makes RTL actually work
rather than merely read correctly: the pin-shadow offsets are measured from the overlay's own
inline edges and applied as inline insets, and the scroll-shadow booleans are computed from
`Math.abs(scrollLeft)`, because `scrollLeft` is signed under RTL. `box-shadow` has no logical form,
so each kit restates the offset's sign under `[dir='rtl']`.

Note that the grid's `direction: 'rtl'` option tells the grid which way it is laid out; it does not
lay the page out. Set `dir='rtl'` on a wrapping element as well, as you would for any RTL content.
