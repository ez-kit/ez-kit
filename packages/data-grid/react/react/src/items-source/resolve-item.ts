import { ItemStatus } from '@ez-kit/data-grid-core'

import type { ListSnapshot, ListItem } from './types'

/** How one value was labelled — see {@link resolveItem}. */
export type ItemResolution = { status: ItemStatus; item?: ListItem }

/** Where a value's label may come from, in the order {@link resolveItem} tries them. */
export type ItemSources = {
	/** The list that labels the value — the base, else the slot's own. */
	labels?: ListSnapshot | undefined
	/** The row the value belongs to, and the column's `getItem` — a cell has one, a chip does not. */
	row?: unknown
	getItem?: ((row: unknown) => ListItem | undefined) | undefined
	/** `value → getItem(row)` over the column's faceted rows — what labels a chip without a list. */
	facetedIndex?: ReadonlyMap<string, ListItem> | undefined
}

const MISSING: ItemResolution = Object.freeze({ status: ItemStatus.Missing })
const PENDING: ItemResolution = Object.freeze({ status: ItemStatus.Pending })
const ERROR: ItemResolution = Object.freeze({ status: ItemStatus.Error })

const IS_DEV = process.env.NODE_ENV !== 'production'

/** Said once per page: a column whose `getItem` throws throws for every row. */
let warnedThrowingGetItem = false

/**
 * The row's own item, or `undefined` when `getItem` throws — a nested field the API left `null`
 * (`row.warehouse.name`) must not take the whole row down. The value falls through to the list's
 * state or its raw self, which is what a missing label already looks like.
 */
export function rowItemOf(getItem: ItemSources['getItem'], row: unknown): ListItem | undefined {
	if (getItem === undefined) return undefined
	try {
		return getItem(row)
	} catch (error) {
		if (IS_DEV && !warnedThrowingGetItem) {
			warnedThrowingGetItem = true
			console.warn('[data-grid] `cell.config.getItem` threw for a row; its value is shown unlabelled.', error)
		}
		return undefined
	}
}

const indexes = new WeakMap<readonly ListItem[], Map<string, ListItem>>()

/** The list's items by value, built once per array — a hundred cells look up one map, not a hundred arrays. */
function indexOf(items: readonly ListItem[]): Map<string, ListItem> {
	const known = indexes.get(items)
	if (known) return known
	// First wins, as a lookup by `find` did: a list that repeats a value labels it the first way.
	const index = new Map<string, ListItem>()
	for (const item of items) if (!index.has(item.value)) index.set(item.value, item)
	indexes.set(items, index)
	return index
}

/**
 * The label of one value, by the one order every reader uses — a cell, a chip, a trigger:
 *
 * 1. the labelling list holds it → `resolved`, from the list;
 * 2. the row's own `getItem` returns one → `resolved`, from the row (cells only);
 * 3. the faceted index holds it → `resolved`, from a row that has the value (chips, triggers);
 * 4. the list is still loading → `pending`;
 * 5. its hook failed → `error`;
 * 6. otherwise → `missing`, and the reader shows the raw value.
 *
 * A list wins over the row because it is the one place an author states a label on purpose; the
 * row is what makes the cell readable before the list arrives. An empty value has no label to
 * find and is `missing` at once — it must not read as loading.
 */
export function resolveItem(value: unknown, { labels, row, getItem, facetedIndex }: ItemSources): ItemResolution {
	if (value === undefined || value === null || value === '') return MISSING
	const key = String(value)

	const fromList = labels ? indexOf(labels.items).get(key) : undefined
	if (fromList) return { status: ItemStatus.Resolved, item: fromList }

	// Only the row's item **for this value**: an editor labels the draft value against the original
	// row, and once the user picks another value the row's own item names the wrong one.
	const fromRow = rowItemOf(getItem, row)
	if (fromRow?.value === key) return { status: ItemStatus.Resolved, item: fromRow }

	const fromFacets = facetedIndex?.get(key)
	if (fromFacets) return { status: ItemStatus.Resolved, item: fromFacets }

	if (labels?.isLoading === true) return PENDING
	if (labels?.error !== undefined) return ERROR
	return MISSING
}
