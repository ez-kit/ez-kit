/**
 * One custom entry an application contributes to a grid affordance the kit renders —
 * `rowActions.actions` per row, `selection.bar.actions` for the whole selection.
 *
 * Not `RowActionItem`: the shape is contributed from two places now, and only one of them is
 * a row. What it describes is the entry, not where the entry sits. The row does extend it —
 * see `RowActionItem`, which adds the `placement` a cell can honour and the bar cannot.
 *
 * `TNode` is the adapter's node type — the same parameter {@link ColumnRenderer} and
 * {@link ExpandingConfig} take, and for the same reason: core has to describe "a renderable
 * thing" without naming React. It defaults to `never`, so an entry's `icon` and `component`
 * are only fillable through an adapter (the React one binds it to `ReactElement`; see
 * `ReactRowActionsConfig` and `SelectionBarConfig`). Headless core can describe the entry but
 * not draw it, which is what headless means.
 */
export type ActionItem<TNode = never> = ActionItemDef<TNode> | ActionItemSlot<TNode>

/** The described half of {@link ActionItem} — the entry the kit draws for you. */
export type ActionItemDef<TNode = never> = {
	/** Stable within its menu or bar — kits key their collection items on it. */
	id: string
	label: string
	/**
	 * The entry's glyph — React: `icon: <Copy />`.
	 *
	 * Deliberately the adapter's own node and **not** a name from the built-in
	 * {@link GridMenuIcon} set: that set is semantic and names *grid* affordances (edit,
	 * delete, pin, sort, hide), which is why each kit is free to map it to its own icons. An
	 * application action has no honest member of it — borrowing `'delete'` for an "Archive"
	 * entry hands it the glyph the kit means by the grid's own Delete — so the vocabulary
	 * stays internal to the entries the grid itself builds, and an application brings its own
	 * element.
	 *
	 * Optional here, because a bar button or a menu entry reads fine label-only. A row entry
	 * that asks to be an inline icon button does not: see `RowActionItem`, where
	 * `placement: 'inline'` makes it required.
	 */
	icon?: TNode
	/**
	 * Class applied to whatever the kit draws for this entry — the menu entry, or the inline
	 * icon button under `placement: 'inline'`.
	 *
	 * A string, not a callback: the entry is built inside `actions({ row })` (or
	 * `actions({ selectedRows })`), so everything a callback could branch on is already in
	 * scope at the point the class is written.
	 */
	className?: string
	disabled?: boolean
	/**
	 * Destructive entry — kits render it in their danger colour, like the built-in Delete.
	 *
	 * Named `destructive`, matching {@link BadgeVariant.Destructive}: one word for the
	 * "this action destroys something" semantic across the whole API, rather than `danger`
	 * here and `destructive` there.
	 */
	destructive?: boolean
	/**
	 * Runs when the entry is chosen.
	 *
	 * `onAction`, not `onClick`: the same entry is a button in the selection bar and a menu
	 * entry under `rowActions`, where it is chosen with Enter, Space or typeahead and no click
	 * happens. Not `onSelect` either — React already gives that name to the DOM text-selection
	 * event, and both kits' menus call the one they mean `onAction`.
	 */
	onAction: () => void
}

/**
 * The other half of {@link ActionItem}: an entry that brings its own markup instead of letting
 * the kit draw it.
 *
 * The described form above is still the one to reach for — it is what buys the kit's glyph,
 * danger colour, disabled state and menu semantics, so an entry matches the built-in Delete
 * beside it. This form is the escape hatch for the entry that shape cannot express (a split
 * button, a bulk-target select, a badge that counts something); nothing is contributed around
 * it, so use the kit's own `Button` inside and the result is on you.
 *
 * `id` is still required — kits key their collection entries on it.
 *
 * Where it lands differs by host, because a menu is a collection and cannot hold loose nodes:
 * in the selection bar `component` *replaces* the entry's button, while in a row-actions menu
 * it becomes the contents of a menu entry the kit still wraps.
 */
export type ActionItemSlot<TNode = never> = {
	/** Stable within its menu or bar — kits key their collection items on it. */
	id: string
	/** The entry's own markup — React: `component: <MyButton />`. */
	component: TNode
}
