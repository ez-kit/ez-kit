'use client'

import { useDataGridInstance } from './data-grid/table-context'

import type { ResolvedGridOptions } from './resolved-options'

/**
 * Everything the grid resolved from its config — merged option layers, settled defaults, and
 * the split between headless and UI fields.
 *
 * Use it from a custom compound child or a UI-kit component that needs to agree with the grid
 * rather than guess: which filter variant is in play, what debounce the inputs use, whether a
 * control is already auto-mounted. Before this existed, that information sat behind private
 * `Symbol()` keys and a kit could only re-derive it from its own constants.
 *
 * Reads a ref, not state — it never triggers a re-render on its own. Subscribe to table state
 * with `useDataGridStore` when you need that.
 *
 * @example
 * const { filtering } = useGridOptions()
 * const debounced = useDebouncedValue(draft, filtering.debounce)
 */
export function useGridOptions(): ResolvedGridOptions {
	return useDataGridInstance().table.grid
}
