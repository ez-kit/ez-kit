import { createTable } from './create-table'

import type { CreatingState } from './features/creating'
import type { EditingState } from './features/editing'
import type { ValidationErrors, ValidationResult } from './features/validation-types'
import type { DataTable, TableConfig } from './types'

/**
 * Typed view of `CreatingState` for a concrete `TData` shape.
 * Same fields as the loose `CreatingState`, but `values` is `Partial<TData>`.
 */
export type TypedCreatingState<TData> = Omit<CreatingState, 'values'> & {
	values: Partial<TData>
}

/**
 * Typed view of `EditingState` for a concrete `TData` shape.
 */
export type TypedEditingState<TData> = Omit<EditingState, 'values'> & {
	values: Partial<TData>
}

/**
 * Typed creating namespace. Narrows `setValue` / `setValues` keys to columns of `TData`.
 *
 * Loose `Table<RowData>` augmentation always exposes the wide `(string, unknown)` form;
 * the typed wrapper {@link createTypedDataGrid} casts to this stricter API.
 */
export type TypedCreatingApi<TData> = {
	start: () => void
	cancel: () => void
	commit: () => Promise<void>
	setValue: <K extends keyof TData & string>(key: K, value: TData[K]) => void
	setValues: (patch: Partial<TData>) => void
	setErrors: (errors: ValidationErrors | null) => void
	setFormError: (msg: string | null) => void
	validate: () => Promise<ValidationResult>
	validateField: (columnId: keyof TData & string) => Promise<void>
	getState: () => TypedCreatingState<TData>
}

/**
 * Typed editing namespace. Narrows `setValue` / `setValues` keys to columns of `TData`.
 */
export type TypedEditingApi<TData> = {
	start: (rowId: string) => void
	startCell: (rowId: string, columnId: keyof TData & string) => void
	cancel: () => void
	commit: () => Promise<void>
	commitCell: () => Promise<void>
	setValue: <K extends keyof TData & string>(key: K, value: TData[K]) => void
	setValues: (patch: Partial<TData>) => void
	setErrors: (errors: ValidationErrors | null) => void
	setFormError: (msg: string | null) => void
	validate: () => Promise<ValidationResult>
	validateField: (columnId: keyof TData & string) => Promise<void>
	getState: () => TypedEditingState<TData>
}

/**
 * Typed table — replaces the loose `creating` / `editing` namespaces with
 * `TData`-typed equivalents. All other `DataTable` methods remain unchanged.
 */
export type TypedDataTable<TData extends object> = Omit<DataTable<TData>, 'creating' | 'editing'> & {
	creating: TypedCreatingApi<TData>
	editing: TypedEditingApi<TData>
}

/**
 * Builds a factory that produces a `TypedDataTable<TData>` instance with
 * fully-typed `creating` / `editing` namespaces.
 *
 * @example
 * type User = { id: number; name: string; email: string }
 *
 * const grid = createTypedDataGrid<User>().create({
 *   data: users,
 *   columns,
 *   creating: { onSave: async (values) => { ... } },
 * })
 *
 * grid.creating.setValue('name', 'Alice')          // ok — typed
 * grid.creating.setValue('emial', 'a@b.co')        // type error — bad key
 * grid.creating.setValue('name', 42)               // type error — wrong value type
 *
 * The wrapper is a thin runtime identity over {@link createTable}; it exists
 * solely to narrow the loose `Table<RowData>` augmentation back to `TData`.
 */
export function createTypedDataGrid<TData extends object>(): {
	create: (config: TableConfig<TData>) => TypedDataTable<TData>
} {
	return {
		create: (config) => createTable<TData>(config) as unknown as TypedDataTable<TData>,
	}
}
