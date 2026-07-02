import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'

import { useTable } from './table-context'

import type { CellTypeRegistry } from '../cell-types-context'
import type { ColumnEditingConfig, ColumnCreatingConfig, FieldState } from '@ez-kit/data-grid-core'
import type { ColumnMeta } from '@tanstack/table-core'
import type { ReactNode } from 'react'

type AutoFormProps = {
	mode: 'creating' | 'editing'
}

/**
 * Renders an auto-generated form for creating or editing a row.
 *
 * Resolution order per column:
 *   1. column.creating/editing.component — user override
 *   2. cellTypes registry by `meta.cellType` — kit composite (shadcn / heroui ship
 *      `text`/`number`/`boolean` etc. that wrap the input in idiomatic Field shells
 *      and consume `field.label` / `field.description` / `field.errors` directly)
 *   3. fallback — bare `<Input>` wrapped here in `<label>` + `<FieldError>` helper.
 *      Used by kits that do not register composite cellTypes (e.g. native).
 *
 * Renderers receive a {@link FieldState} with `id`, optional `label` / `description`,
 * `errors` / `error`, `onBlur`, `isValidating`.
 */
export function AutoForm({ mode }: AutoFormProps): ReactNode {
	const table = useTable()
	const { Input } = useGridComponents().core
	const cellTypes = useCellTypes()

	const state = mode === 'creating' ? table.creating.getState() : table.editing.getState()
	const values = state.values
	const errors = state.errors
	const isValidating = state.commitStatus === 'validating'

	const setValue = (key: string, value: unknown): void => {
		if (mode === 'creating') {
			table.creating.setValue(key, value)
		} else {
			table.editing.setValue(key, value)
		}
	}

	const validateField = (columnId: string): void => {
		if (mode === 'creating') {
			void table.creating.validateField(columnId)
		} else {
			void table.editing.validateField(columnId)
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
				const onBlur = (): void => {
					validateField(col.id)
				}
				const fieldErrors = errors[col.id] ?? []
				const fieldError = fieldErrors[0]
				const label = resolveLabel(col.columnDef.header, col.id)
				const description = colDef?.description
				const field: FieldState = {
					id: `${mode}-${col.id}`,
					value,
					onChange,
					onBlur,
					...(meta?.config !== undefined ? { config: meta.config } : {}),
					label,
					...(description !== undefined ? { description } : {}),
					error: fieldError,
					errors: fieldErrors,
					isValidating,
				}

				// 1. column-level component (user override) — composite is responsible
				//    for rendering label/description/error from FieldState.
				const customComp = resolveColumnComponent(colDef)
				if (customComp) {
					return <div key={col.id}>{customComp(field)}</div>
				}

				// 2. registry by cellType — kit composite renders the full Field shell.
				if (meta?.cellType) {
					const regComp = resolveRegistryComponent(meta, mode, cellTypes)
					if (regComp) return <div key={col.id}>{regComp(field)}</div>
				}

				// 3. fallback: kits without a composite registry entry (e.g. native)
				//    get a generic <label> + <Input> + <FieldError> rendered here.
				return (
					<div
						key={col.id}
						{...(fieldError ? { 'data-error': true } : {})}
					>
						<label htmlFor={field.id}>{label}</label>
						<Input
							id={field.id}
							value={(value ?? '') as string | number | readonly string[]}
							onChange={(e) => {
								onChange(e.target.value)
							}}
							onBlur={onBlur}
						/>
						{fieldError ? <FieldError messages={fieldErrors} /> : null}
					</div>
				)
			})}
		</div>
	)
}

// ── helpers ───────────────────────────────────────────────────────────────

/**
 * Renders validation messages for a single field. UI kits can target
 * `[data-field-error]` to style the message; the element's plain text
 * guarantees errors are visible even without kit-specific CSS.
 */
function FieldError({ messages }: { messages: readonly string[] }): ReactNode {
	if (messages.length === 0) return null
	if (messages.length === 1) {
		return (
			<small
				data-field-error
				role='alert'
			>
				{messages[0]}
			</small>
		)
	}
	return (
		<ul
			data-field-error
			role='alert'
		>
			{messages.map((m, i) => (
				<li key={i}>{m}</li>
			))}
		</ul>
	)
}

type ColConfig = false | ColumnEditingConfig | ColumnCreatingConfig | undefined

function resolveLabel(header: unknown, fallback: string): string {
	return typeof header === 'string' ? header : fallback
}

function resolveColumnComponent(colDef: ColConfig): ((props: FieldState) => ReactNode) | undefined {
	if (!colDef) return undefined
	const comp = colDef.component
	return comp ? (comp as (props: FieldState) => ReactNode) : undefined
}

function resolveRegistryComponent(
	meta: ColumnMeta<unknown, unknown>,
	mode: 'creating' | 'editing',
	cellTypes: CellTypeRegistry,
): ((props: FieldState) => ReactNode) | undefined {
	if (!meta.cellType) return undefined
	const def = cellTypes[meta.cellType]
	if (!def) return undefined
	const comp = mode === 'creating' ? (def.creating ?? def.edit) : def.edit
	return comp
}
