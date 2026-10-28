import { ColumnFormMode, CommitStatus, resolveColumnFormConfig } from '@ez-kit/data-grid-core'

import { useCellTypes } from '../cell-types-context'
import { useGridComponents } from '../components-context'
import { ItemsSourceSlot, useItemsListsFor } from '../items-source'

import { flexRender } from './flex-render'
import { fieldItemsProps } from './items-view'
import { useDataGridState, useDataGridTable } from './table-context'

import type { CellTypeRegistry } from '../cell-types-context'
import type { DataTable, ErasedRow, GridFeatures } from '../types'
import type { FormColumnMeta, FieldState, ResolvedColumnFormConfig } from '@ez-kit/data-grid-core'
import type { ComponentType, ReactNode } from 'react'

type AutoFormProps = {
	/**
	 * Which feature's form is being rendered. The core {@link ColumnFormMode}, not a local
	 * twin: it named the same two members with the same two values, and it is the very value
	 * `resolveColumnFormConfig` takes to pick between `meta.creating` and `meta.editing`.
	 */
	mode: ColumnFormMode
}

/** One field of a generated form: the column it edits and the element that renders it. */
export type FormField = {
	columnId: string
	/** A `data-slot='auto-form-field'` wrapper, keyed by `columnId`. */
	element: ReactNode
}

/**
 * Renders an auto-generated form for creating or editing a row: the fields of
 * {@link useFormFields}, in column order, inside a `data-slot='auto-form'` wrapper.
 */
export function AutoForm({ mode }: AutoFormProps): ReactNode {
	const fields = useFormFields(mode)
	return (
		// The two slots carry no styling of their own — they exist so a kit can stack the
		// generated fields (each composite renders its own label / input / error, and nothing
		// between them otherwise separates one field from the next).
		<div data-slot='auto-form'>{fields.map((field) => field.element)}</div>
	)
}

/**
 * One field of the generated form, rendered on its own — what `FormModalProps.fields` holds.
 *
 * A component rather than a resolved element, so a `FormModal` that never renders the generated
 * fields never resolves them: their subscriptions and value-list reads exist only where one is
 * rendered.
 */
export function AutoFormField({ mode, columnId }: AutoFormProps & { columnId: string }): ReactNode {
	const [field] = useFormFields(mode, columnId)
	return field?.element ?? null
}

/**
 * The ids of the columns that get a field in the generated form, in column order — not a system
 * column, and not opted out of this form with `creating: false` / `editing: false`. Reads the
 * column defs only, so it costs no subscription.
 */
export function formFieldIds(table: DataTable<GridFeatures, ErasedRow>, mode: ColumnFormMode): readonly string[] {
	return table
		.getAllColumns()
		.filter((col) => isFormColumn(col.columnDef.meta as FormColumnMeta | undefined, mode))
		.map((col) => col.id)
}

function isFormColumn(meta: FormColumnMeta | undefined, mode: ColumnFormMode): boolean {
	return !meta?.isSystemColumn && resolveColumnFormConfig(meta, mode) !== false
}

/**
 * The fields of the generated form for creating or editing a row, in column order — the one
 * place that decides which columns get a field and how each renders, so the generated form and
 * the `fields` a modal render function receives cannot disagree.
 *
 * Resolution order per column:
 *   1. column.creating/editing.component — user override
 *   2. cellTypes registry by `meta.cell?.type` — kit composite (shadcn / heroui ship
 *      `text`/`number`/`boolean` etc. that wrap the input in idiomatic Field shells
 *      and consume `field.label` / `field.description` / `field.errors` directly)
 *   3. fallback — bare `<Input>` wrapped here in `<label>` + `<FieldError>` helper.
 *      Used by kits that do not register composite cellTypes (e.g. native).
 *
 * Renderers receive a {@link FieldState} with `id`, optional `label` / `description`,
 * `errors` / `error`, `onBlur`, `isValidating`.
 */
export function useFormFields(mode: ColumnFormMode, onlyColumnId?: string): readonly FormField[] {
	const table = useDataGridTable()
	useDataGridState((s) => (mode === ColumnFormMode.Creating ? s.creating : s.editing))
	const { Input } = useGridComponents().core
	const cellTypes = useCellTypes()

	const state = mode === ColumnFormMode.Creating ? table.creating.getState() : table.editing.getState()
	const values = state.values
	const errors = state.errors
	const isValidating = state.commitStatus === CommitStatus.Validating

	const setValue = (key: string, value: unknown): void => {
		if (mode === ColumnFormMode.Creating) {
			table.creating.setValue(key, value)
		} else {
			table.editing.setValue(key, value)
		}
	}

	const allColumns = table.getAllColumns()
	const formColumns = onlyColumnId === undefined ? allColumns : allColumns.filter((col) => col.id === onlyColumnId)
	const slot = mode === ColumnFormMode.Creating ? ItemsSourceSlot.Creating : ItemsSourceSlot.Editing
	// One hook for every field's list — the fields are rendered in a loop. A column that renders no
	// field reads nothing, which keeps the reads positional with the columns.
	const lists = useItemsListsFor(
		formColumns.map((col) => {
			const meta = col.columnDef.meta as FormColumnMeta | undefined
			const hasField = meta !== undefined && !meta.isSystemColumn && resolveColumnFormConfig(meta, mode) !== false
			return { id: col.id, meta: hasField ? meta : {}, slot }
		}),
	)
	// The edited row, so a column's `getItem` labels its value while the list is still loading. A
	// create form has no row yet.
	const editedRow = mode === ColumnFormMode.Editing ? editedRowOf(table, table.editing.getState().rowId) : undefined

	const validateField = (columnId: string): void => {
		if (mode === ColumnFormMode.Creating) {
			void table.creating.validateField(columnId)
		} else {
			void table.editing.validateField(columnId)
		}
	}

	return formColumns.flatMap((col, index): FormField[] => {
		// `ColumnMeta` is declared `in out` in both its `TFeatures` and its `TData` upstream, so no
		// concrete instantiation is assignable to any other and this cast is forced by the variance
		// annotation rather than chosen. `FormColumnMeta` is the one name core declares for it, and
		// this is the same cast core's own `creating.ts` makes at its boundary.
		const meta = col.columnDef.meta as FormColumnMeta | undefined
		if (meta?.isSystemColumn) return []

		// `component`, `description`, `validateOn` and `debounce` in one resolution, with the
		// documented per-field fallback from `creating` to `editing` — the same helper the
		// headless creating feature uses for the two timing fields.
		const colDef = resolveColumnFormConfig(meta, mode)
		if (colDef === false) return []

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
		const fieldLists = lists[index]
		const field: FieldState = {
			id: `${mode}-${col.id}`,
			value,
			onChange,
			onBlur,
			...fieldItemsProps(meta ?? {}, slot, fieldLists?.options, fieldLists?.labels, value, editedRow),
			label,
			...(description !== undefined ? { description } : {}),
			error: fieldError,
			errors: fieldErrors,
			isValidating,
		}

		// 1. column-level component (user override) — composite is responsible
		//    for rendering label/description/error from FieldState.
		// 2. registry by cell type — kit composite renders the full Field shell.
		const composite =
			resolveColumnComponent(colDef) ?? (meta?.cell?.type ? resolveRegistryComponent(meta, mode, cellTypes) : undefined)
		if (composite) {
			return [
				{
					columnId: col.id,
					element: (
						<div
							key={col.id}
							data-slot='auto-form-field'
						>
							{flexRender(composite, field)}
						</div>
					),
				},
			]
		}

		// 3. fallback: kits without a composite registry entry (e.g. native)
		//    get a generic <label> + <Input> + <FieldError> rendered here.
		return [
			{
				columnId: col.id,
				element: (
					<div
						key={col.id}
						data-slot='auto-form-field'
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
				),
			},
		]
	})
}

// ── helpers ───────────────────────────────────────────────────────────────

/** The original of the row being edited, or `undefined` when there is none (or it is gone). */
export function editedRowOf(table: DataTable<GridFeatures, ErasedRow>, rowId: string | null | undefined): unknown {
	if (rowId === null || rowId === undefined) return undefined
	const row = table.getCoreRowModel().rowsById[rowId] as { original: unknown } | undefined
	return row?.original
}

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

type ColConfig = false | ResolvedColumnFormConfig | undefined

function resolveLabel(header: unknown, fallback: string): string {
	return typeof header === 'string' ? header : fallback
}

function resolveColumnComponent(colDef: ColConfig): ComponentType<FieldState> | undefined {
	if (!colDef) return undefined
	const comp = colDef.component
	return comp ? (comp as ComponentType<FieldState>) : undefined
}

function resolveRegistryComponent(
	meta: FormColumnMeta,
	mode: ColumnFormMode,
	cellTypes: CellTypeRegistry,
): ComponentType<FieldState> | undefined {
	const cellTypeId = meta.cell?.type
	if (!cellTypeId) return undefined
	const def = cellTypes[cellTypeId]
	if (!def) return undefined
	const comp = mode === ColumnFormMode.Creating ? (def.creating ?? def.editing) : def.editing
	return comp
}
