import { warnOnce } from '../../utils/warn-once'

import type { BadgeItem, ColumnCellMeta, ItemsSource, SelectItem } from '../types'

const IS_DEV = process.env.NODE_ENV !== 'production'

/** The cell types whose `config` carries a value list — the only ones `useItems` / `getItem` apply to. */
const ITEM_CELL_TYPES: ReadonlySet<string> = new Set(['select', 'badge'])

/** Whether a cell type labels its values from a list. */
export function isItemCellType(cellType: string | undefined): boolean {
	return cellType !== undefined && ITEM_CELL_TYPES.has(cellType)
}

/** The two ways one level states its list. */
type ItemsLevel = { items?: unknown; useItems?: unknown } | undefined

/**
 * Warns, in development, when one level states its list twice. The grid uses `useItems` then —
 * the hook is the newer statement, and a column migrating from a fixed list to a hook is the
 * likeliest way to end up with both.
 */
export function warnOnBothItemSources(who: string, level: string, config: ItemsLevel): void {
	if (!IS_DEV || config === undefined) return
	if (config.items === undefined || config.useItems === undefined) return
	warnOnce(
		`[data-grid] ${who} sets both \`${level}.items\` and \`${level}.useItems\`. The grid uses ` +
			'`useItems`; remove the other one.',
	)
}

/**
 * The resolved `cell` meta of a `select` / `badge` cell with its `useItems` and `getItem` lifted
 * out of `config` and onto the meta itself.
 *
 * Out of `config` because `config` is what the grid hands a kit's component, and a component must
 * not be handed a hook it would have to call (or a row function written against a row type it
 * cannot know). Any other cell type's config is left exactly as written.
 */
export function liftItemsSource(cellMeta: ColumnCellMeta, who: string): ColumnCellMeta {
	const { config } = cellMeta
	if (config === undefined || !isItemCellType(cellMeta.type)) return cellMeta
	warnOnBothItemSources(who, 'cell.config', config)
	if (config.useItems === undefined && config.getItem === undefined) return cellMeta
	const { useItems, getItem, ...rest } = config
	return {
		...cellMeta,
		config: rest,
		...(useItems !== undefined ? { useItems: useItems as ItemsSource<SelectItem | BadgeItem> } : {}),
		...(getItem !== undefined ? { getItem: getItem as (row: unknown) => SelectItem | BadgeItem | undefined } : {}),
	}
}
