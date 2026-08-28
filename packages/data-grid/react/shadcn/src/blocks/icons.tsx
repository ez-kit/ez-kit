import { GridMenuIcon, isGridMenuIcon } from '@ez-kit/data-grid-react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, EyeOff, Pencil, PinOff, Trash2, X } from 'lucide-react'

import type { GridMenuItem } from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

/** Every dropdown entry in this kit leads with a 16px icon and the same gutter. */
const MENU_ICON = 'mr-2 h-4 w-4'

/**
 * The shared layer names an entry's *meaning* (`GridMenuIcon`); this map turns it into the
 * glyph and sizing this kit uses. One map serves both the column header menu and the row
 * actions menu — they render through the same `Menu` component.
 */
export const GRID_MENU_ICONS: Record<GridMenuIcon, ReactNode> = {
	[GridMenuIcon.Edit]: <Pencil className={MENU_ICON} />,
	[GridMenuIcon.Delete]: <Trash2 className={MENU_ICON} />,
	[GridMenuIcon.PinTop]: <ArrowUp className={MENU_ICON} />,
	[GridMenuIcon.PinBottom]: <ArrowDown className={MENU_ICON} />,
	[GridMenuIcon.PinLeft]: <ArrowLeft className={MENU_ICON} />,
	[GridMenuIcon.PinRight]: <ArrowRight className={MENU_ICON} />,
	[GridMenuIcon.Unpin]: <PinOff className={MENU_ICON} />,
	[GridMenuIcon.SortAsc]: <ArrowUp className={MENU_ICON} />,
	[GridMenuIcon.SortDesc]: <ArrowDown className={MENU_ICON} />,
	[GridMenuIcon.ClearSort]: <X className={MENU_ICON} />,
	[GridMenuIcon.Hide]: <EyeOff className={MENU_ICON} />,
}

/**
 * Stand-in for an entry that carries no icon — only a consumer-supplied row action ever does,
 * since every entry the grid builds sets one. It occupies the glyph's exact box and gutter so
 * the label stays aligned with its icon-bearing siblings instead of sliding left.
 */
export const GRID_MENU_ICON_PLACEHOLDER: ReactNode = (
	<span
		className={MENU_ICON}
		aria-hidden
	/>
)

/**
 * The glyph for a menu entry: a built-in name is looked up in this kit's map, anything else is
 * the consumer's own element (a custom row action's `icon: <Copy />`) and is rendered as-is.
 * An entry with no icon gets the placeholder so its label stays aligned with its siblings'.
 */
export function renderGridMenuIcon(icon: GridMenuItem['icon']): ReactNode {
	if (icon === undefined) return GRID_MENU_ICON_PLACEHOLDER
	return isGridMenuIcon(icon) ? GRID_MENU_ICONS[icon] : icon
}
