import {
	configLayersOf,
	hasItemCellType,
	ItemsSourceSlot,
	labelListOf,
	resolveItem,
	staticSnapshot,
	useItemsLists,
} from '../items-source'

import { flexRender } from './flex-render'

import type { CellViewProps } from '../cell-types-context'
import type { ItemsMeta, ListSnapshot } from '../items-source'
import type { FieldState } from '@ez-kit/data-grid-core'
import type { ComponentType, ReactNode } from 'react'

type CellConfig = Record<string, unknown>

/**
 * `cell.config` with the slot's layers laid over it, nearest last, each key replacing the one
 * beneath it whole. A layer's `items` / `useItems` are dropped: a layer never states a list (core
 * warns when one does), and the slot's own list goes on top in {@link configWithItems}.
 *
 * The base comes back as it is — same object — when no layer is set, so a column without layers
 * hands its renderers exactly what it did before layers existed.
 */
function layeredConfig(meta: ItemsMeta, slot: ItemsSourceSlot): CellConfig | undefined {
	const base = meta.cell?.config
	const layers = configLayersOf(meta, slot).filter((layer) => layer !== undefined)
	if (layers.length === 0) return base
	return layers.reduce<CellConfig>((merged, layer) => {
		const { items: _items, useItems: _useItems, ...keys } = layer
		return { ...merged, ...keys }
	}, base ?? {})
}

/**
 * The `config` a kit's component is handed: the column's own with the slot's layers over it, and
 * `items` replaced by the list this place resolved to. `useItems` and `getItem` were never in it —
 * the mapper lifts them out — so a component that reads `config.items` gets the right list and
 * knows nothing about hooks.
 *
 * `undefined` exactly when the column wrote no config, sets no layer for the slot and states no
 * list, as before.
 */
export function configWithItems(
	meta: ItemsMeta,
	slot: ItemsSourceSlot,
	options: ListSnapshot | undefined,
): CellConfig | undefined {
	const config = layeredConfig(meta, slot)
	// Only a `select` / `badge` config holds `items`. Any other cell type's config is its own shape,
	// handed over as written even when a level of the column states a list — a `text` column with
	// `editing.items` must not grow a config it never declared.
	if (options === undefined || !hasItemCellType(meta)) return config
	return { ...config, items: options.items }
}

/** The props `config` arrives under, spread so an absent config stays an absent key. */
function configProp(config: CellConfig | undefined): { config?: CellConfig } {
	return config !== undefined ? { config } : {}
}

type ItemsCellViewProps = {
	view: ComponentType<CellViewProps>
	meta: ItemsMeta
	columnId: string
	value: unknown
	row: unknown
	rowIndex: number
}

/**
 * The view of a `select` / `badge` cell, with its value labelled — its own component so that the
 * list subscription is a hook of its own and every other cell type pays nothing for it.
 */
export function ItemsCellView({ view, meta, columnId, value, row, rowIndex }: ItemsCellViewProps): ReactNode {
	const { options, labels } = useItemsLists(columnId, meta, ItemsSourceSlot.Cell)
	return itemsCellView(view, meta, options, labels, value, row, rowIndex)
}

function itemsCellView(
	view: ComponentType<CellViewProps>,
	meta: ItemsMeta,
	options: ListSnapshot | undefined,
	labels: ListSnapshot | undefined,
	value: unknown,
	row: unknown,
	rowIndex: number,
): ReactNode {
	const { status, item } = resolveItem(value, { labels, row, getItem: meta.cell?.getItem })
	return flexRender(view, {
		value,
		row,
		rowIndex,
		...configProp(configWithItems(meta, ItemsSourceSlot.Cell, options)),
		itemStatus: status,
		...(item !== undefined ? { item } : {}),
	})
}

/** The cell view props of a cell type without a list — the column's config, forwarded as written. */
export function plainCellViewProps(meta: ItemsMeta, value: unknown, row: unknown, rowIndex: number): CellViewProps {
	return { value, row, rowIndex, ...configProp(meta.cell?.config) }
}

/** Whether a column's view goes through {@link ItemsCellView}. */
export const isItemsColumn = hasItemCellType

/**
 * A cell's base list is a fixed array, or absent: the view is resolved right here, with no
 * subscription — a hundred cells of a static `select` column pay for a lookup and nothing else.
 */
export function isStaticItemsColumn(meta: ItemsMeta): boolean {
	return labelListOf(meta, ItemsSourceSlot.Cell)?.useItems === undefined
}

/** {@link ItemsCellView} for a column whose list {@link isStaticItemsColumn} — a call, not a component. */
export function renderStaticItemsCell(
	view: ComponentType<CellViewProps>,
	meta: ItemsMeta,
	value: unknown,
	row: unknown,
	rowIndex: number,
): ReactNode {
	const spec = labelListOf(meta, ItemsSourceSlot.Cell)
	const snapshot = spec?.items === undefined ? undefined : staticSnapshot(spec.items)
	return itemsCellView(view, meta, snapshot, snapshot, value, row, rowIndex)
}

/** The part of a {@link FieldState} that the field's value list decides. */
export type FieldItemsProps = Pick<FieldState, 'config' | 'itemsLoading' | 'itemsError' | 'item'>

/**
 * What an edit or create field of a `select` / `badge` column is handed about its list: `config`
 * with the items this field offers, whether they are loading, the hook's error, and the current
 * value's item from the base — which labels the trigger even when the field no longer offers it.
 *
 * Any other cell type gets its config as written and nothing else. A hook either way, so the
 * subscription lives exactly as long as the field.
 */
export function useFieldItems(
	columnId: string,
	meta: ItemsMeta,
	slot: typeof ItemsSourceSlot.Editing | typeof ItemsSourceSlot.Creating | typeof ItemsSourceSlot.Filtering,
	value: unknown,
	row?: unknown,
): FieldItemsProps {
	const { options, labels } = useItemsLists(columnId, meta, slot)
	return fieldItemsProps(meta, slot, options, labels, value, row)
}

/** {@link useFieldItems} as a pure function, for a caller that already holds the lists. */
export function fieldItemsProps(
	meta: ItemsMeta,
	slot: ItemsSourceSlot,
	options: ListSnapshot | undefined,
	labels: ListSnapshot | undefined,
	value: unknown,
	row?: unknown,
): FieldItemsProps {
	const config = configWithItems(meta, slot, options)
	if (!hasItemCellType(meta) || options === undefined) return configProp(config)
	const { item } = resolveItem(value, { labels, row, getItem: row === undefined ? undefined : meta.cell?.getItem })
	return {
		...configProp(config),
		itemsLoading: options.isLoading,
		...(options.error !== undefined ? { itemsError: options.error } : {}),
		...(item !== undefined ? { item } : {}),
	}
}
