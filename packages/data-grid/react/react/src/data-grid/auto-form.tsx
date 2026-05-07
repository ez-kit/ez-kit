import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'

import { useTableContext } from './table-context'

import type { CellInputProps, CellTypeRegistry } from '../cell-types-context'
import type { ColumnEditingConfig, ColumnCreatingConfig } from '@ez-kit/data-grid-core'
import type { ColumnMeta } from '@tanstack/table-core'
import type { ReactNode } from 'react'

type AutoFormProps = {
	mode: 'creating' | 'editing'
}

/**
 * Renders an auto-generated form for creating or editing a row.
 * Iterates over columns, renders the configured input or a default <Input>.
 * Supports `editing.component` / `creating.component` and `CellTypeRegistry` for DI.
 */
export function AutoForm({ mode }: AutoFormProps): ReactNode {
	const table = useTableContext()
	const { Input } = useGridComponents()
	const cellTypes = useCellTypes()

	const values: Record<string, unknown> =
		mode === 'creating' ? table.getCreatingState().creatingValues : table.getEditingState().editingValues

	const setValue = (key: string, value: unknown): void => {
		if (mode === 'creating') {
			table.setCreatingValue(key, value)
		} else {
			table.setEditingValue(key, value)
		}
	}

	return (
		<div>
			{table.getAllColumns().map((col) => {
				const meta = col.columnDef.meta
				if (meta?.isSystemColumn) return null

				const colDef = mode === 'creating' ? meta?.creating : meta?.editing
				if (colDef === false) return null

				const value = values[col.id]
				const onChange = (v: unknown): void => {
					setValue(col.id, v)
				}

				const label = resolveLabel(col.columnDef.header, col.id)

				// 1. column-level component (prefer `component` over legacy `input`)
				const customComp = resolveColumnComponent(colDef)
				if (customComp) {
					return (
						<div key={col.id}>
							<label>{label}</label>
							{customComp({ value, onChange, ...(meta?.config !== undefined ? { config: meta.config } : {}) })}
						</div>
					)
				}

				// 2. registry by cellType
				if (meta?.cellType) {
					const regComp = resolveRegistryComponent(meta, mode, cellTypes)
					if (regComp)
						return (
							<div key={col.id}>
								<label>{label}</label>
								{regComp({ value, onChange, ...(meta.config !== undefined ? { config: meta.config } : {}) })}
							</div>
						)
				}

				// 3. plain text fallback
				return (
					<div key={col.id}>
						<label>{label}</label>
						<Input
							value={(value ?? '') as string | number | readonly string[]}
							onChange={(e) => {
								onChange(e.target.value)
							}}
						/>
					</div>
				)
			})}
		</div>
	)
}

// ── helpers ───────────────────────────────────────────────────────────────

type ColConfig = false | ColumnEditingConfig | ColumnCreatingConfig | undefined

function resolveLabel(header: unknown, fallback: string): string {
	return typeof header === 'string' ? header : fallback
}

function resolveColumnComponent(colDef: ColConfig): ((props: CellInputProps) => ReactNode) | undefined {
	if (!colDef) return undefined
	const comp = colDef.component
	return comp ? (comp as (props: CellInputProps) => ReactNode) : undefined
}

function resolveRegistryComponent(
	meta: ColumnMeta<unknown, unknown>,
	mode: 'creating' | 'editing',
	cellTypes: CellTypeRegistry,
): ((props: CellInputProps) => ReactNode) | undefined {
	if (!meta.cellType) return undefined
	const def = cellTypes[meta.cellType]
	if (!def) return undefined
	const comp = mode === 'creating' ? (def.creating ?? def.edit) : def.edit
	return comp
}
