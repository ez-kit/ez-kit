import { ACTIONS_COLUMN_ID, SELECTION_COLUMN_ID } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { getCommonPinStyles } from '../utils/pin-styles'

import { useTableContext } from './table-context'

import type { CellTypeRegistry } from '../cell-types-context'
import type { InputProps } from '../types'
import type { ColumnMeta } from '@tanstack/table-core'
import type { ChangeEvent, ComponentType, ReactNode } from 'react'

/**
 * Inline creating row rendered inside <tbody>.
 * Renders an input cell for each non-system column.
 * Used for creating.mode = 'row' | 'pin-row'.
 * Supports `creating.component` and `CellTypeRegistry` for DI.
 */
export function CreatingRow() {
	const table = useTableContext()
	const { Tr, Td, Input, Checkbox, CreatingActionsCell } = useGridComponents()
	const cellTypes = useCellTypes()
	const values = table.getCreatingState().creatingValues
	const creatingConfig = table.options.creating
	const isPinRow = creatingConfig?.mode === 'pin-row'

	return (
		<Tr data-creating-row>
			{table.getVisibleLeafColumns().map((col) => {
				const meta = col.columnDef.meta
				const pinStyles = getCommonPinStyles(col)
				const pinned = col.getIsPinned()

				if (meta?.isSystemColumn) {
					if (col.id === ACTIONS_COLUMN_ID) {
						return (
							<Td
								key={col.id}
								style={pinStyles}
								pinned={pinned}
							>
								{CreatingActionsCell ? (
									<CreatingActionsCell
										onSave={() => table.commitCreating()}
										onCancel={() => {
											table.cancelCreating()
										}}
										isPinRow={isPinRow}
									/>
								) : null}
							</Td>
						)
					}
					if (col.id === SELECTION_COLUMN_ID) {
						return (
							<Td
								key={col.id}
								style={pinStyles}
								pinned={pinned}
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
							style={pinStyles}
							pinned={pinned}
						/>
					)
				}

				if (meta?.creating === false) {
					return (
						<Td
							key={col.id}
							style={pinStyles}
							pinned={pinned}
						/>
					)
				}

				const value = values[col.id] ?? ''
				const onChange = (v: unknown) => {
					table.setCreatingValue(col.id, v)
				}

				return (
					<Td
						key={col.id}
						style={pinStyles}
						pinned={pinned}
					>
						{renderCreatingInput({
							meta,
							value,
							onChange,
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
	value: unknown
	onChange: (v: unknown) => void
	cellTypes: CellTypeRegistry
	Input: ComponentType<InputProps>
	placeholder?: string
}

function renderCreatingInput({ meta, value, onChange, cellTypes, Input, placeholder }: CreatingInputArgs): ReactNode {
	// 1. column-level creating.component
	const creatingConfig = meta?.creating
	if (creatingConfig !== false && creatingConfig !== undefined) {
			const comp = creatingConfig.component
			if (comp)
				return comp({
					value,
					onChange,
					...(meta.config !== undefined ? { config: meta.config } : {}),
				}) as ReactNode
		}

	// 2. registry creating → edit fallback by cellType
	if (meta?.cellType) {
		const def = cellTypes[meta.cellType]
		const comp = def?.creating ?? def?.edit
		if (comp) return comp({ value, onChange, ...(meta.config !== undefined ? { config: meta.config } : {}) })
	}

	// 3. default Input
	return (
		<Input
			value={value as string | number | readonly string[]}
			placeholder={placeholder}
			onChange={(e: ChangeEvent<HTMLInputElement>) => {
				onChange(e.target.value)
			}}
		/>
	)
}
