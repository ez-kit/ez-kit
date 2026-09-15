'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
import { useGridComponents } from '@ez-kit/data-grid-react/kit'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Progress } from '@grid-shadcn/components/ui/progress'

import type { CellTypeDefinition, CellViewProps, FieldState, ProgressCellConfig } from '@ez-kit/data-grid-react'

function ProgressCellView({ value, config }: CellViewProps<ProgressCellConfig>) {
	const max = config?.max ?? 100
	const num = Number(value)
	const pct = Number.isFinite(num) ? (num / max) * 100 : 0

	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
			<Progress
				value={pct}
				style={{ flex: 1 }}
			/>
			<span style={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}>{num}</span>
		</span>
	)
}

/** Progress (numeric) cell input. Wraps shadcn Field/NumberInput. */
function ProgressCellInput({ id, value, onChange, onBlur, label, description, errors }: FieldState) {
	const { NumberInput } = useGridComponents().core
	const hasError = errors.length > 0
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<NumberInput
				value={typeof value === 'number' ? value : undefined}
				onChange={onChange}
				onBlur={onBlur}
			/>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}

/**
 * This kit's `progress` registry entry — importable on its own, so a consumer can register only the
 * cell types it uses. `blocks/cell-types.ts` composes the default registry from these.
 *
 * Annotated rather than inferred, and restating the phantom `__config` the spread carries: see
 * the note on `KitCellTypes` in `../cell-types.ts` for what an inferred type does to the
 * bundled declarations.
 */
const progressCellType: CellTypeDefinition<ProgressCellConfig> & { __config?: ProgressCellConfig } = {
	...baseCellTypes.progress,
	view: ProgressCellView,
	editing: ProgressCellInput,
}

export { ProgressCellInput, progressCellType, ProgressCellView }
