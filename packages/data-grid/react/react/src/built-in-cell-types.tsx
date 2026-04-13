import { useGridComponents } from './components-context'

import type { CellInputProps, CellTypeRegistry } from './cell-types-context'
import type { ReactNode } from 'react'

// ── per-type input components ─────────────────────────────────────────────
// Proper React components so they call useGridComponents() during render and
// automatically pick up whatever NumberInput/DateField/Checkbox the consumer
// provides via GridComponentsProvider.

function NumberCellInput({ value, onChange }: CellInputProps): ReactNode {
	const { NumberInput } = useGridComponents()
	return (
		<NumberInput
			value={typeof value === 'number' ? value : undefined}
			onChange={(n) => {
				onChange(n)
			}}
		/>
	)
}

function BooleanCellInput({ value, onChange }: CellInputProps): ReactNode {
	const { Checkbox } = useGridComponents()
	return (
		<Checkbox
			value={Boolean(value)}
			onChange={(checked) => {
				onChange(checked)
			}}
		/>
	)
}

// Filter cycles: indeterminate (no filter) → true → false → indeterminate
// indeterminate = value is undefined/null (filter is off)
function BooleanFilterInput({ value, onChange }: CellInputProps): ReactNode {
	const { Checkbox } = useGridComponents()
	const isIndeterminate = value === undefined || value === null

	const handleChange = () => {
		if (isIndeterminate) {
			onChange(true)
		} else if (value === true) {
			onChange(false)
		} else {
			onChange(undefined)
		}
	}
	return (
		<Checkbox
			value={isIndeterminate ? undefined : Boolean(value)}
			indeterminate={isIndeterminate}
			onChange={handleChange}
		/>
	)
}

function DateCellInput({ value, onChange }: CellInputProps): ReactNode {
	const { DateField } = useGridComponents()
	return (
		<DateField
			value={typeof value === 'string' ? value : undefined}
			onChange={(s) => {
				onChange(s)
			}}
		/>
	)
}

// ── registry ──────────────────────────────────────────────────────────────
// Render functions are lazy — they create React elements that are only
// rendered (and therefore call hooks) during the actual render pass.
// `creating` is intentionally omitted: the existing `creating → edit`
// fallback in the resolution chain handles it automatically.

export const BUILT_IN_CELL_TYPES: CellTypeRegistry = {
	number: {
		edit: (props) => <NumberCellInput {...props} />,
		filter: (props) => <NumberCellInput {...props} />,
	},
	boolean: {
		edit: (props) => <BooleanCellInput {...props} />,
		filter: (props) => <BooleanFilterInput {...props} />,
	},
	date: {
		edit: (props) => <DateCellInput {...props} />,
		filter: (props) => <DateCellInput {...props} />,
	},
}
