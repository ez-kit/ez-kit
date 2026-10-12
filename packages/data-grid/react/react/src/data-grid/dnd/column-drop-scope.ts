import { ColumnMoveScope } from '@ez-kit/data-grid-core'

import { DragSurface } from './types'

/**
 * Which `ColumnMoveScope` a column drop is judged under, per surface.
 *
 * The header shows the visible leaves and nothing else, so `Visible` is the only scope a drop there
 * can honestly be asked about — a hidden column renders no header cell and can be neither end of
 * that drop. The panel lists hidden columns *precisely so they can be reordered*, which is `All`,
 * and is the same scope its one-step move pair already uses (`visibility-trigger.tsx`). So the two
 * surfaces of one axis commit the same slice under two scopes, which is what `DragSurface` exists
 * to tell apart.
 *
 * A lookup keyed by the closed set rather than a ternary, so a third surface is a compile error
 * here rather than a silent fall back to `Visible`.
 *
 * **In its own module because three call sites must agree, and one of them is an announcement.**
 * `GridDndProvider` asks it twice — once in `canDrop`, which gates the hover, and once in the commit
 * — and `buildDndAnnouncements` asks it a third time, to stay silent about a drop the commit will
 * refuse. A second copy of this mapping would be a surface judged under one scope and announced
 * under another.
 */
export const COLUMN_DROP_SCOPE: Record<DragSurface, ColumnMoveScope> = {
	[DragSurface.Table]: ColumnMoveScope.Visible,
	[DragSurface.Panel]: ColumnMoveScope.All,
}
