import { GridMenuIcon, isGridMenuIcon } from '@ez-kit/data-grid-react'
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

import type { GridMenuItem } from '@ez-kit/data-grid-react'
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

/**
 * Stand-in for an entry that carries no icon — only a consumer-supplied row action ever does,
 * since every entry the grid builds sets one. It occupies the glyph's exact box so the label
 * stays aligned with its icon-bearing siblings instead of sliding left.
 */
export const GRID_MENU_ICON_PLACEHOLDER: ReactNode = (
	<span
		style={{ display: 'inline-block', width: MENU_ICON_SIZE, height: MENU_ICON_SIZE }}
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

/**
 * The same glyph for an entry rendered as a button — the selection bar's custom actions.
 *
 * No placeholder here, unlike {@link renderGridMenuIcon}: buttons sit side by side rather than
 * stacked, so an icon-less one has no column to keep its label aligned with, and a blank box
 * would only pad it.
 */
export function renderActionIcon(icon: GridMenuItem['icon']): ReactNode {
	if (icon === undefined) return null
	return isGridMenuIcon(icon) ? GRID_MENU_ICONS[icon] : icon
}
