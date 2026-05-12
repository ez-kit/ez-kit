import { useGridComponents } from '../components-context'

import type { CellTypeDefinition } from '../cell-types-context'
import type { FieldState } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

export type BooleanCellConfig = {
	/** Label rendered (by the kit's view component) for `true`. */
	trueLabel?: string
	/** Label rendered (by the kit's view component) for `false`. */
	falseLabel?: string
}

function BooleanCellInput(props: FieldState<BooleanCellConfig>): ReactNode {
	const { Checkbox } = useGridComponents()
	return (
		<Checkbox
			value={Boolean(props.value)}
			onChange={(checked) => {
				props.onChange(checked)
			}}
		/>
	)
}

/**
 * Shared `boolean` cell type — provides `edit` and `creating` only.
 *
 * View and filter remain UI-kit specific because they involve visual idioms
 * (icons, switch vs check, tri-state filter) that don't fit a single shared
 * shape. Kits spread this and add their own `view` / `filter`:
 *
 * ```tsx
 * { boolean: { ...booleanCellType, view: MyBooleanView, filter: MyBooleanFilter } }
 * ```
 */
export const booleanCellType: CellTypeDefinition<BooleanCellConfig> = {
	edit: BooleanCellInput,
	creating: BooleanCellInput,
}
