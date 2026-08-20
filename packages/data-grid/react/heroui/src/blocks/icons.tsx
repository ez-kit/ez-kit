import { GridMenuIcon } from '@ez-kit/data-grid-react'
import {
	ArrowDown,
	ArrowDownToLine,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ArrowUpToLine,
	EyeOff,
	Pencil,
	PinOff,
	Trash2,
	X,
} from 'lucide-react'

import type { ReactNode } from 'react'

/** HeroUI's `Dropdown.Item` lays out its own gutter, so menu icons only need a size. */
const MENU_ICON_SIZE = 16

/**
 * The shared layer names an entry's *meaning* (`GridMenuIcon`); this map turns it into the
 * glyph and sizing this kit uses. One map serves both the column header menu and the row
 * actions menu — they render through the same `Menu` component.
 */
export const GRID_MENU_ICONS: Record<GridMenuIcon, ReactNode> = {
	[GridMenuIcon.Edit]: <Pencil size={MENU_ICON_SIZE} />,
	[GridMenuIcon.Delete]: <Trash2 size={MENU_ICON_SIZE} />,
	[GridMenuIcon.PinTop]: <ArrowUpToLine size={MENU_ICON_SIZE} />,
	[GridMenuIcon.PinBottom]: <ArrowDownToLine size={MENU_ICON_SIZE} />,
	[GridMenuIcon.PinLeft]: <ArrowLeft size={MENU_ICON_SIZE} />,
	[GridMenuIcon.PinRight]: <ArrowRight size={MENU_ICON_SIZE} />,
	[GridMenuIcon.Unpin]: <PinOff size={MENU_ICON_SIZE} />,
	[GridMenuIcon.SortAsc]: <ArrowUp size={MENU_ICON_SIZE} />,
	[GridMenuIcon.SortDesc]: <ArrowDown size={MENU_ICON_SIZE} />,
	[GridMenuIcon.ClearSort]: <X size={MENU_ICON_SIZE} />,
	[GridMenuIcon.Hide]: <EyeOff size={MENU_ICON_SIZE} />,
}
