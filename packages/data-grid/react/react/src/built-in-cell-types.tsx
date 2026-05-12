import { useGridComponents } from './components-context'

import type { CellInputProps, CellTypeRegistry } from './cell-types-context'
import type { ReactNode } from 'react'

// ── per-type input components ─────────────────────────────────────────────
// Proper React components so they call useGridComponents() during render and
// automatically pick up whatever NumberInput the consumer provides via
// GridComponentsProvider. `boolean` and `date` cell types live in UI-kit
// packages — see @ez-kit/data-grid-heroui / -shadcn registries.

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
}
