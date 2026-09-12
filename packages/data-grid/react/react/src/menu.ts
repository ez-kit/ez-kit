/**
 * The one menu model every overflow dropdown in the grid speaks.
 *
 * There used to be two: `ColumnMenu` (a `sections` object of pin / sorting / visibility
 * callbacks) and `RowActionsMenu` (a flat `items` array). Both rendered the same thing —
 * a trigger plus icon+label entries with destructive and disabled states — so every kit
 * implemented that twice, and the two drifted. One shape, one component, one icon map.
 */

import type { GridMenuIcon } from '@ez-kit/data-grid-core'
import type { ReactElement } from 'react'

// The icon vocabulary itself lives in core: `RowActionsConfig` is a core option, so the set a
// consumer writes an icon from has to be nameable there. Re-exported here because this is the
// module that describes the menu model a kit renders.
export { GridMenuIcon, isGridMenuIcon } from '@ez-kit/data-grid-core'

/**
 * One entry in the model above: described as data, or handed over whole.
 *
 * Everything the grid itself builds is a {@link GridMenuItemDef}. The slot form reaches a kit
 * only from `rowActions.actions` / `selection.bar.actions`, where the author asked to draw the
 * entry themselves — narrow with {@link isGridMenuItemSlot} before reading `label`.
 */
export type GridMenuItem = GridMenuItemDef | GridMenuItemSlot

/** An entry the kit draws: its glyph, its danger colour, its disabled state. */
export type GridMenuItemDef = {
	/** Stable within the menu — kits key their collection items on it. */
	id: string
	/** Default wording; a kit may localize it. */
	label: string
	/**
	 * A member of the built-in {@link GridMenuIcon} set, which the kit maps to its own glyph
	 * and sizing, or an element the consumer supplied for an action the set has no honest name
	 * for. The built-in names cover grid affordances (edit / delete / pin / sort / hide); a
	 * custom row action such as "Duplicate" brings its own `<Copy />`.
	 *
	 * Every entry the grid itself builds — `buildColumnMenuSections` and the row-actions
	 * builder — sets a named member unconditionally, so in practice only a custom action
	 * reaches a kit carrying an element or nothing at all. Use `isGridMenuIcon` to tell the
	 * two apart; an entry with neither renders label-only.
	 */
	icon?: GridMenuIcon | ReactElement
	/**
	 * Class the kit puts on whatever it draws for this entry — the menu entry, or the inline
	 * icon button when the entry asked for `placement: 'inline'`. Only ever set from an
	 * `ActionItemDef`; nothing the grid builds itself carries one.
	 */
	className?: string
	disabled?: boolean
	/** Destructive entry — kits render it in their danger colour. */
	destructive?: boolean
	/** Runs when the entry is chosen — by click, by Enter / Space, or by menu typeahead. */
	onAction: () => void
}

/**
 * An entry the author draws, from an `ActionItemSlot`. The kit contributes no chrome: in a bar
 * `component` stands where the entry's button would have been, and in a menu — a collection
 * that cannot hold loose nodes — it fills a menu entry the kit still wraps.
 */
export type GridMenuItemSlot = {
	id: string
	component: ReactElement
}

/** Narrows a {@link GridMenuItem} to the half that carries its own markup. */
export function isGridMenuItemSlot(item: GridMenuItem): item is GridMenuItemSlot {
	return 'component' in item
}

export type GridMenuSection = {
	id: string
	/** Heading a kit may render above the group. Sections without one run together. */
	label?: string
	items: GridMenuItem[]
}

/** Where the menu sits, which is all that changes about its trigger. */
export const GridMenuVariant = {
	/** Column header overflow — a compact trigger sized to the header row. */
	Column: 'column',
	/** Row overflow — a trigger matching the inline row action buttons. */
	Row: 'row',
} as const

export type GridMenuVariant = (typeof GridMenuVariant)[keyof typeof GridMenuVariant]

export type GridMenuProps = {
	variant: GridMenuVariant
	/** Already filtered: a section reaches the kit only when it has entries. */
	sections: GridMenuSection[]
	'aria-label': string
}

/** Drops empty sections so a kit never has to decide whether a group is worth rendering. */
export function toMenuSections(sections: GridMenuSection[]): GridMenuSection[] {
	return sections.filter((section) => section.items.length > 0)
}
