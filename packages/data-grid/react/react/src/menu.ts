/**
 * The one menu model every overflow dropdown in the grid speaks.
 *
 * There used to be two: `ColumnMenu` (a `sections` object of pin / sorting / visibility
 * callbacks) and `RowActionsMenu` (a flat `items` array). Both rendered the same thing —
 * a trigger plus icon+label entries with danger and disabled states — so every kit
 * implemented that twice, and the two drifted. One shape, one component, one icon map.
 */

/**
 * Which glyph an entry carries. Semantic on purpose: the shared layer names the *meaning*,
 * each kit maps it to its own icon set and sizing (see each kit's `blocks/icons.tsx`).
 */
export const GridMenuIcon = {
	Edit: 'edit',
	Delete: 'delete',
	PinTop: 'pin-top',
	PinBottom: 'pin-bottom',
	PinLeft: 'pin-left',
	PinRight: 'pin-right',
	Unpin: 'unpin',
	SortAsc: 'sort-asc',
	SortDesc: 'sort-desc',
	ClearSort: 'clear-sort',
	Hide: 'hide',
} as const

export type GridMenuIcon = (typeof GridMenuIcon)[keyof typeof GridMenuIcon]

export type GridMenuItem = {
	/** Stable within the menu — kits key their collection items on it. */
	id: string
	/** Default wording; a kit may localize it. */
	label: string
	icon: GridMenuIcon
	disabled?: boolean
	/** Destructive entry — kits render it in a danger colour. */
	danger?: boolean
	onSelect: () => void
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
