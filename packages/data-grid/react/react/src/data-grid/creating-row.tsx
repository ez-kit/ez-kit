import { ACTIONS_COLUMN_ID, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { RowActionsMode } from '../types'
import { getCommonPinStyles } from '../utils/pin-styles'

import { useTable } from './table-context'

import type { CellTypeRegistry } from '../cell-types-context'
import type { InputProps } from '../types'
import type { FieldState } from '@ez-kit/data-grid-core'
import type { ColumnMeta } from '@tanstack/table-core'
import type { ChangeEvent, ComponentType, ReactNode } from 'react'

/**
 * Inline creating row rendered inside <tbody>.
 * Renders an input cell for each non-system column.
 * Used for creating.mode = 'row' | 'pin-row'.
 * Edit-mode renderers receive a {@link FieldState} with `error` / `errors` / `onBlur`.
 */
export function CreatingRow() {
	const table = useTable()
	const gridComponents = useGridComponents()
	const { Tr, Td, Input, Checkbox } = gridComponents.core
	const { ActionsCell } = gridComponents['row-actions']
	const cellTypes = useCellTypes()
	const state = table.creating.getState()
	const values = state.values
	const errors = state.errors
	const isValidating = state.commitStatus === 'validating'
	const isPending = state.commitStatus !== 'idle'
	const creatingConfig = table.options.creating
	const isPinRow = creatingConfig?.mode === 'pin-row'

	return (
		<Tr
			data-slot='tr'
			data-creating-row
		>
			{table.getVisibleLeafColumns().map((col) => {
				const meta = col.columnDef.meta
				const pinVars = getCommonPinStyles(col)
				const pinned = col.getIsPinned()
				const pinnedAttrs = pinned ? { 'data-pinned': pinned } : {}

				if (meta?.isSystemColumn) {
					if (col.id === ACTIONS_COLUMN_ID) {
						return (
							<Td
								key={col.id}
								data-slot='td'
								style={pinVars}
								pinned={pinned}
								{...pinnedAttrs}
							>
								<ActionsCell
									mode={RowActionsMode.Creating}
									onSave={() => table.creating.commit()}
									onCancel={() => {
										table.creating.cancel()
									}}
									canCancel={!isPinRow}
									isPending={isPending}
								/>
							</Td>
						)
					}
					if (col.id === SELECTION_COLUMN_ID) {
						return (
							<Td
								key={col.id}
								data-slot='td'
								style={pinVars}
								pinned={pinned}
								{...pinnedAttrs}
							>
								<Checkbox
									value={false}
									disabled
									aria-label='Select row'
								/>
							</Td>
						)
					}
					return (
						<Td
							key={col.id}
							data-slot='td'
							style={pinVars}
							pinned={pinned}
							{...pinnedAttrs}
						/>
					)
				}

				if (meta?.creating === false) {
					return (
						<Td
							key={col.id}
							data-slot='td'
							style={pinVars}
							pinned={pinned}
							{...pinnedAttrs}
						/>
					)
				}

				const value = values[col.id] ?? ''
				const onChange = (v: unknown): void => {
					table.creating.setValue(col.id, v)
				}
				const onBlur = (): void => {
					void table.creating.validateField(col.id)
				}
				const fieldErrors = errors[col.id] ?? []
				const fieldError = fieldErrors[0]
				const fieldState: FieldState = {
					id: `creating-${col.id}`,
					value,
					onChange,
					onBlur,
					...(meta?.config !== undefined ? { config: meta.config } : {}),
					error: fieldError,
					errors: fieldErrors,
					isValidating,
				}

				return (
					<Td
						key={col.id}
						data-slot='td'
						style={pinVars}
						pinned={pinned}
						{...pinnedAttrs}
						{...(fieldError ? { 'data-error': true } : {})}
					>
						{renderCreatingInput({
							meta,
							field: fieldState,
							cellTypes,
							Input,
							placeholder: typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id,
						})}
					</Td>
				)
			})}
		</Tr>
	)
}

// ── helpers ───────────────────────────────────────────────────────────────

type CreatingInputArgs = {
	meta: ColumnMeta<unknown, unknown> | undefined
	field: FieldState
	cellTypes: CellTypeRegistry
	Input: ComponentType<InputProps>
	placeholder?: string
}

function renderCreatingInput({ meta, field, cellTypes, Input, placeholder }: CreatingInputArgs): ReactNode {
	// 1. column-level creating.component
	const creatingConfig = meta?.creating
	if (creatingConfig !== false && creatingConfig !== undefined) {
		const comp = creatingConfig.component
		if (comp) return comp(field) as ReactNode
	}

	// 2. registry creating → edit fallback by cellType
	if (meta?.cellType) {
		const def = cellTypes[meta.cellType]
		const comp = def?.creating ?? def?.edit
		if (comp) return comp(field)
	}

	// 3. default Input
	return (
		<Input
			value={field.value as string | number | readonly string[]}
			placeholder={placeholder}
			onChange={(e: ChangeEvent<HTMLInputElement>) => {
				field.onChange(e.target.value)
			}}
			onBlur={field.onBlur}
		/>
	)
}
