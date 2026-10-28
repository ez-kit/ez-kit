import { isItemCellType } from '@ez-kit/data-grid-core'

import { ItemsOwner, ItemsSourceSlot } from './types'

import type { ListSnapshot, ListItem, ListSource } from './types'
import type {
	ColumnCellMeta,
	ColumnCreatingConfig,
	ColumnEditingConfig,
	ColumnFilteringMeta,
} from '@ez-kit/data-grid-core'

/** The parts of a column's meta (or a filter field's) that state value lists. */
export type ItemsMeta = {
	cell?: ColumnCellMeta | undefined
	filtering?: false | ColumnFilteringMeta | undefined
	// Only the two list fields and the config layer: the rest of these configs is generic over
	// the row, and a list reader has no row type to name.
	editing?: false | Pick<ColumnEditingConfig, 'items' | 'useItems' | 'config'> | undefined
	creating?: false | Pick<ColumnCreatingConfig, 'items' | 'useItems' | 'config'> | undefined
}

/** The list one level states: a hook, or a fixed array. */
export type ListSpec =
	| { owner: ItemsOwner; useItems: ListSource; items?: undefined }
	| { owner: ItemsOwner; useItems?: undefined; items: readonly ListItem[] }

type LevelLists = { items?: readonly unknown[] | undefined; useItems?: unknown }

/**
 * The list a level states itself. A hook wins over a fixed list beside it, which development
 * builds warn about. An empty fixed list states nothing — it was never a reason to stop falling
 * back, and the filter has always skipped one.
 */
function listOf(owner: ItemsOwner, level: LevelLists | false | undefined): ListSpec | undefined {
	if (!level) return undefined
	if (level.useItems !== undefined) return { owner, useItems: level.useItems as ListSource }
	if (level.items !== undefined && level.items.length > 0) return { owner, items: level.items as ListItem[] }
	return undefined
}

/** Whether the column is a `select` / `badge` — the only cell types with a base list. */
export function hasItemCellType(meta: ItemsMeta): boolean {
	return isItemCellType(meta.cell?.type)
}

/** The column's base list — `cell.config.useItems`, else `cell.config.items`. */
export function baseListOf(meta: ItemsMeta): ListSpec | undefined {
	if (!hasItemCellType(meta)) return undefined
	const cell = meta.cell
	return listOf(ItemsOwner.Base, {
		useItems: cell?.useItems,
		items: (cell?.config as { items?: readonly unknown[] } | undefined)?.items,
	})
}

/** What a level offers, falling back along the inheritance chain. */
const OPTIONS_BY_SLOT: Record<ItemsSourceSlot, (meta: ItemsMeta) => ListSpec | undefined> = {
	[ItemsSourceSlot.Cell]: baseListOf,
	[ItemsSourceSlot.Filtering]: (meta) => listOf(ItemsOwner.Filtering, meta.filtering) ?? baseListOf(meta),
	[ItemsSourceSlot.Editing]: (meta) => listOf(ItemsOwner.Editing, meta.editing) ?? baseListOf(meta),
	[ItemsSourceSlot.Creating]: (meta) =>
		listOf(ItemsOwner.Creating, meta.creating) ?? listOf(ItemsOwner.Editing, meta.editing) ?? baseListOf(meta),
}

/** One level's config layer, as written. */
export type ConfigLayer = Readonly<Record<string, unknown>>

function layerOf(level: { config?: ConfigLayer | undefined } | false | undefined): ConfigLayer | undefined {
	// Read as nullable: the types forbid a `null` layer, but a JavaScript column can still write one,
	// and spreading it would throw where an absent layer is simply skipped.
	const layer: ConfigLayer | null | undefined = level ? level.config : undefined
	return layer ?? undefined
}

/**
 * The config layers a slot lays over `cell.config`, nearest last — the same inheritance as
 * {@link OPTIONS_BY_SLOT}, kept beside it so the two cannot drift: a create field takes the
 * editor's layer beneath its own, as it takes the editor's list when it states none. The cell is
 * the base itself and has no layer.
 */
const CONFIG_LAYERS_BY_SLOT: Record<ItemsSourceSlot, (meta: ItemsMeta) => readonly (ConfigLayer | undefined)[]> = {
	[ItemsSourceSlot.Cell]: () => [],
	[ItemsSourceSlot.Filtering]: (meta) => [layerOf(meta.filtering)],
	[ItemsSourceSlot.Editing]: (meta) => [layerOf(meta.editing)],
	[ItemsSourceSlot.Creating]: (meta) => [layerOf(meta.editing), layerOf(meta.creating)],
}

/** The config layers a slot lays over `cell.config`, nearest last; absent ones included. */
export function configLayersOf(meta: ItemsMeta, slot: ItemsSourceSlot): readonly (ConfigLayer | undefined)[] {
	return CONFIG_LAYERS_BY_SLOT[slot](meta)
}

/**
 * The list a slot offers: its own, else the level it inherits from. A create field that states
 * nothing inherits the editor's list — and with it the editor's store key, so one hook serves both.
 */
export function optionsListOf(meta: ItemsMeta, slot: ItemsSourceSlot): ListSpec | undefined {
	return OPTIONS_BY_SLOT[slot](meta)
}

/**
 * The list a slot's values are labelled from: always the base when the column has one — an
 * override changes what is offered, never what a value is called — else the slot's own.
 */
export function labelListOf(meta: ItemsMeta, slot: ItemsSourceSlot): ListSpec | undefined {
	return baseListOf(meta) ?? optionsListOf(meta, slot)
}

const staticSnapshots = new WeakMap<readonly ListItem[], ListSnapshot>()

/** A fixed list as a snapshot — loaded, no error. One object per array, so readers can memoize on it. */
export function staticSnapshot(items: readonly ListItem[]): ListSnapshot {
	const known = staticSnapshots.get(items)
	if (known) return known
	const snapshot: ListSnapshot = { items, isLoading: false, error: undefined }
	staticSnapshots.set(items, snapshot)
	return snapshot
}
