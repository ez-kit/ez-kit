import type { BadgeItem, FilterItem, ItemsSource } from '@ez-kit/data-grid-core'

/**
 * Any item a value list can hold — a select's, a badge's (with `variant`) or a filter's (with
 * `count`). The readers each take the fields they need.
 */
export type ListItem = BadgeItem & FilterItem

/** A list hook, item-erased — what the store and the runners hold. */
export type ListSource = ItemsSource<ListItem>

/**
 * Which level of a column states the list a control reads.
 *
 * Named members for internal reference; the field is typed as the plain string union.
 */
export const ItemsOwner = {
	/** `cell.config.items` / `cell.config.useItems` — the column's base list, and its labels. */
	Base: 'base',
	Filtering: 'filtering',
	Editing: 'editing',
	Creating: 'creating',
} as const

export type ItemsOwner = (typeof ItemsOwner)[keyof typeof ItemsOwner]

/**
 * Where a list is read: a cell, the column's filter, its editor or its create field. Each one
 * resolves to an {@link ItemsOwner} by the inheritance chain — `creating → editing → base`,
 * `filtering → base`, a cell always the base.
 *
 * Exported as values too, for a call site that prefers a name; the parameter is typed as the
 * plain string union, so `useItemsSource(columnId, 'filtering')` needs no import.
 */
export const ItemsSourceSlot = {
	Cell: 'cell',
	Filtering: 'filtering',
	Editing: 'editing',
	Creating: 'creating',
} as const

export type ItemsSourceSlot = (typeof ItemsSourceSlot)[keyof typeof ItemsSourceSlot]

/**
 * A value list as a reader sees it: the items, and whether the hook behind them is still loading
 * or failed. A fixed `items` array reads as loaded with no error.
 *
 * An item is whatever the list holds — a select's, a badge's (with `variant`) or a filter's (with
 * `count`). The fields are named after the hook's own result, which this mirrors.
 */
export type ItemsSourceSnapshot = {
	items: readonly (BadgeItem | FilterItem)[]
	isLoading: boolean
	/** What the hook failed with; `undefined` when it did not. */
	error: unknown
}

/** {@link ItemsSourceSnapshot} as the grid keeps it internally, with every item field readable. */
export type ListSnapshot = {
	items: readonly ListItem[]
	isLoading: boolean
	/** What the hook failed with; `undefined` when it did not. */
	error: unknown
}

/** The two lists a control reads: the values it offers, and the one that labels them. */
export type ItemsLists = {
	/** What the control offers. `undefined` when the column states no list for this slot. */
	options: ListSnapshot | undefined
	/** What labels a value — the base list, else {@link ItemsLists.options}. */
	labels: ListSnapshot | undefined
}
