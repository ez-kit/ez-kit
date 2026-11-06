import { useGridComponents } from '../components-context'
import { DATA_GRID_DEFAULTS } from '../defaults'

import { useDataGridState, useDataGridTable } from './table-context'
import { useFilterInput } from './use-filter-input'

export type DataGridGlobalFilterInputProps = {
	/** Override the placeholder configured via `globalFiltering.placeholder`. */
	placeholder?: string
}

/**
 * Headless wrapper around `GridComponents.GlobalFilterInput`.
 *
 * Reads the normalized {@link NormalizedGlobalFilteringConfig} from
 * `table.grid.globalFiltering`, holds a local draft of the input value, debounces commits to
 * `table.setGlobalFilter`, and syncs back when external code mutates `state.globalFilter`
 * (e.g. programmatic reset, controlled mode).
 *
 * Placed by a layout — `Toolbar.start` in every preset that carries one. It reads no option
 * saying where it goes: rendering it is what puts it there.
 */
export function GlobalFilterInput({ placeholder: placeholderProp }: DataGridGlobalFilterInputProps = {}) {
	const table = useDataGridTable()
	// The subscription is the read — see `active-filters-bar.tsx` for the note.
	const globalFilter = useDataGridState((s) => s.globalFilter as unknown)
	const { GlobalFilterInput: Component } = useGridComponents().filtering

	const cfg = table.grid.globalFiltering

	const debounce = cfg?.debounce ?? DATA_GRID_DEFAULTS.filtering.debounce
	const placeholder = placeholderProp ?? cfg?.placeholder ?? table.grid.messages.globalFiltering.placeholder

	const input = useFilterInput({
		value: String(globalFilter ?? ''),
		onCommit: (value: string) => {
			table.setGlobalFilter(value === '' ? undefined : value)
		},
		debounce: table.options.draft === true ? 0 : debounce,
		table,
		scope: { axis: 'globalFilter' },
		read: () => String(table.store.state.globalFilter ?? ''),
	})

	return (
		<Component
			value={input.value}
			onChange={input.onChange}
			placeholder={placeholder}
			debounce={debounce}
			data-slot='global-filter-input'
		/>
	)
}
