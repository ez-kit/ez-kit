/**
 * The attributes marking the item currently being dragged, and the selectors that find them.
 *
 * One spelling each, in a module of its own, because four unrelated places need them: the two
 * components that stamp them (`row.tsx`, `column-drag.tsx`), the chord handlers that stand down on
 * them, and the focus model, which is in a different directory and must not import the drag stack to
 * read an attribute name. This file imports nothing, so none of them pay for the others — in
 * particular the focus model does not reach `dnd/index.ts` and the adapter context behind it.
 *
 * **Why `data-row-*` / `data-column-*` rather than one `data-dragging`.** React Aria's `Row` writes
 * its own `data-*` set *after* spreading the props it was handed, and `data-dragging` is one of
 * its own — it supports dragging natively — so in the heroui kit the value was replaced by RAC's
 * empty string and the attribute said nothing. Its `Column` does **not** do that, measured: the
 * seven it writes are `data-hovered`, `data-pressed`, `data-focused`, `data-focus-visible`,
 * `data-resizing`, `data-allows-sorting` and `data-sort-direction`. So the row's name is a
 * collision fix and the column's is consistency with it; saying otherwise would invent a reason.
 *
 * Stamped for a **pointer** drag exactly as for a keyboard one — nothing here distinguishes them,
 * and the handlers that read them deliberately do not either.
 */

/** On the `<tr>` of the row being dragged. */
export const ROW_DRAGGING_ATTR = 'data-row-dragging'

/** On the `<th>` of the column being dragged, or the visibility panel's item shell. */
export const COLUMN_DRAGGING_ATTR = 'data-column-dragging'

/** Matches the `<th>` of the column being dragged. */
export const COLUMN_DRAGGING_SELECTOR = `[${COLUMN_DRAGGING_ATTR}]`

/** Matches a dragged item on either axis — for a reader that stands down for any drag at all. */
export const ANY_DRAGGING_SELECTOR = `[${ROW_DRAGGING_ATTR}], [${COLUMN_DRAGGING_ATTR}]`
