/**
 * Which glyph a menu or row-action entry carries. **Semantic on purpose**: this names the
 * *meaning* of an entry — "delete", "pin to the top" — and each UI kit maps the name to its own
 * icon set and sizing (see each kit's `blocks/icons.tsx`). Core therefore never has to name a
 * framework's node type to describe an icon.
 *
 * Lives in core rather than in the React adapter because {@link RowActionsConfig} — a core
 * option — is what a consumer writes an icon on. Leaving the set in React meant the type core
 * exposed was a bare `string`, so `icon: 'copy'` compiled and then silently rendered nothing.
 *
 * A custom action that has no honest member of this set does not have to invent one: the icon
 * slot also accepts the adapter's own node type (React: a `ReactElement`), so `icon: <Copy />`
 * is the escape hatch. See {@link RowActionItem.icon}.
 *
 * Named members for internal reference; the field is typed as the plain string union, so
 * `icon: 'delete'` is equally valid and needs no import.
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

const GRID_MENU_ICON_VALUES: readonly string[] = Object.values(GridMenuIcon)

/**
 * Whether a value names a glyph in the closed built-in set.
 *
 * A kit needs this to render the icon slot: a member is looked up in the kit's own icon map,
 * anything else is the consumer's own node and is rendered as-is.
 */
export function isGridMenuIcon(value: unknown): value is GridMenuIcon {
	return typeof value === 'string' && GRID_MENU_ICON_VALUES.includes(value)
}
