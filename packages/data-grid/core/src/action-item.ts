import type { GridMenuIcon } from './menu-icon'

/**
 * One custom entry an application contributes to a grid affordance the kit renders —
 * `rowActions.actions` per row, `selection.bar.actions` for the whole selection.
 *
 * Not `RowActionItem`: the shape is contributed from two places now, and only one of them is
 * a row. What it describes is the entry, not where the entry sits.
 *
 * Structurally the React layer's `GridMenuItem`. `TNode` is the adapter's node type — the same
 * parameter {@link ColumnRenderer} and {@link ExpandingConfig} take, and for the same reason:
 * core has to describe "a renderable thing" without naming React. It defaults to `never`, so a
 * config written against bare core accepts only the named glyphs; the React adapter binds it to
 * `ReactElement` (see `ReactRowActionsConfig` and `SelectionBarConfig`).
 */
export type ActionItem<TNode = never> = {
	/** Stable within its menu or bar — kits key their collection items on it. */
	id: string
	label: string
	/**
	 * The entry's glyph: either a member of the closed {@link GridMenuIcon} set, which the kit
	 * maps to its own icon and sizing, or the adapter's own node for an application action the
	 * set has no honest name for — React: `icon: <Copy />`.
	 *
	 * Deliberately **not** a bare `string`. It was one, and a kit silently dropped any value
	 * that named no member, so `icon: 'copy'` compiled, ran, and rendered a label with no glyph
	 * and no error anywhere. Omitting it entirely is still fine — the entry renders label-only.
	 */
	icon?: GridMenuIcon | TNode
	disabled?: boolean
	/**
	 * Destructive entry — kits render it in their danger colour, like the built-in Delete.
	 *
	 * Named `destructive`, matching {@link BadgeVariant.Destructive}: one word for the
	 * "this action destroys something" semantic across the whole API, rather than `danger`
	 * here and `destructive` there.
	 */
	destructive?: boolean
	onSelect: () => void
}
