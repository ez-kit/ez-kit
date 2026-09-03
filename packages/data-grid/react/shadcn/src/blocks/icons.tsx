import { GridMenuIcon, isGridMenuIcon } from '@ez-kit/data-grid-react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, EyeOff, Pencil, PinOff, Trash2, X } from 'lucide-react'
import { createElement } from 'react'

import type { GridMenuItem } from '@ez-kit/data-grid-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Every dropdown entry in this kit leads with a 16px icon and the same gutter. */
const MENU_ICON = 'mr-2 h-4 w-4'

/** The same glyph inside a button, where the button's own `gap` supplies the gutter. */
const BUTTON_ICON = 'h-4 w-4'

/**
 * The shared layer names an entry's *meaning* (`GridMenuIcon`); this map names the glyph this
 * kit draws for it. Components rather than elements because the same meaning is rendered at two
 * sizings — a menu entry's, with its gutter, and a bar button's, without — and a baked-in
 * `className` cannot be taken back off.
 */
const GRID_MENU_ICON_COMPONENTS: Record<GridMenuIcon, LucideIcon> = {
	[GridMenuIcon.Edit]: Pencil,
	[GridMenuIcon.Delete]: Trash2,
	[GridMenuIcon.PinTop]: ArrowUp,
	[GridMenuIcon.PinBottom]: ArrowDown,
	[GridMenuIcon.PinLeft]: ArrowLeft,
	[GridMenuIcon.PinRight]: ArrowRight,
	[GridMenuIcon.Unpin]: PinOff,
	[GridMenuIcon.SortAsc]: ArrowUp,
	[GridMenuIcon.SortDesc]: ArrowDown,
	[GridMenuIcon.ClearSort]: X,
	[GridMenuIcon.Hide]: EyeOff,
}

/**
 * The built-in glyphs as menu entries render them. One map serves both the column header menu
 * and the row actions menu — they render through the same `Menu` component.
 */
export const GRID_MENU_ICONS: Record<GridMenuIcon, ReactNode> = Object.fromEntries(
	Object.entries(GRID_MENU_ICON_COMPONENTS).map(([name, Icon]) => [
		name,
		createElement(Icon, { className: MENU_ICON }),
	]),
) as Record<GridMenuIcon, ReactNode>

/**
 * Stand-in for an entry that carries no icon — only a consumer-supplied action ever does,
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

/**
 * The same glyph for an entry rendered as a button — the selection bar's custom actions.
 *
 * No placeholder here, unlike {@link renderGridMenuIcon}: buttons sit side by side rather than
 * stacked, so an icon-less one has no column to keep its label aligned with, and a blank box
 * would only pad it.
 */
export function renderActionIcon(icon: GridMenuItem['icon']): ReactNode {
	if (icon === undefined) return null
	if (!isGridMenuIcon(icon)) return icon
	const Icon = GRID_MENU_ICON_COMPONENTS[icon]
	return <Icon className={BUTTON_ICON} />
}
