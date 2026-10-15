/**
 * A row-model slot as the feature set holds it: called once per table, returning the function the
 * table calls for its rows.
 */
type RowModelSlot = (table: GatedTable) => () => unknown

/**
 * What the gate touches on a table: the option it follows, and the page rewind
 * `rowPaginationFeature` contributes when it is registered. Upstream's declarations name the rewind
 * `_autoResetPageIndex`; the instance carries it as `autoResetPageIndex`, which is what is called.
 */
type GatedTable = {
	options: { enableColumnFilters?: boolean }
	autoResetPageIndex?: () => void
}

const gatedSlots = new WeakMap<RowModelSlot, RowModelSlot>()
const gatedSets = new WeakMap<object, object>()

/**
 * Wrap a `filteredRowModel` slot so the model follows column filtering being switched on a live
 * instance.
 *
 * With column filtering off, every leaf column carries a filter function that keeps each row
 * (`mapColumns`, `columnFiltering: false`), which is what stops a seeded `columnFilters` slice from
 * filtering. But upstream memoizes the filtered model on `[preFiltered, columnFilters,
 * globalFilter]` only — not on the columns — so swapping those functions when the config flips
 * would leave the rows stale until the data, a filter or the search changed. The wrapper builds a
 * fresh inner model, and so a fresh memo, whenever `options.enableColumnFilters` changes, which the
 * core writes on every call. It costs one recompute per switch and nothing between them.
 *
 * A fresh memo skips its first `onAfterUpdate`, which is where upstream rewinds the page after a
 * filter result changes — so the switch rewinds it here instead, or a grid on page five would land
 * on an empty page once the filter came on. The rewind is upstream's own, gated the same way: it
 * does nothing unless the grid pages client-side.
 *
 * Cached per slot, so the same consumer slot always yields the same wrapper.
 */
function gateColumnFilters(slot: RowModelSlot): RowModelSlot {
	const cached = gatedSlots.get(slot)
	if (cached !== undefined) return cached

	const gated: RowModelSlot = (table) => {
		let enabled: boolean | undefined
		let model: (() => unknown) | undefined
		return () => {
			const next = table.options.enableColumnFilters !== false
			if (model === undefined) {
				enabled = next
				model = slot(table)
			} else if (next !== enabled) {
				enabled = next
				model = slot(table)
				table.autoResetPageIndex?.()
			}
			return model()
		}
	}
	gatedSlots.set(slot, gated)
	return gated
}

/**
 * The consumer's feature set with its `filteredRowModel` gated by {@link gateColumnFilters}, or
 * the set itself when it registers none.
 *
 * Cached per consumer set, so a set handed in on every render yields one object for the table —
 * not the consumer's own object any more, but a stable one.
 */
export function withGatedFilteredRowModel<TFeatures extends object>(features: TFeatures): TFeatures {
	const slot = (features as { filteredRowModel?: RowModelSlot }).filteredRowModel
	if (slot === undefined) return features

	const cached = gatedSets.get(features)
	if (cached !== undefined) return cached as TFeatures

	const gated = { ...features, filteredRowModel: gateColumnFilters(slot) }
	gatedSets.set(features, gated)
	return gated
}
