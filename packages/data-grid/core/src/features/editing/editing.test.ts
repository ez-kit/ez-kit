import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'
import { ValidationError } from '../validation'

import type { ValidateContext } from '../validation'

type Row = {
	id: number
	name: string
	password: string
	confirmPassword: string
}

const DATA: Row[] = [
	{ id: 1, name: 'Alice', password: 'old-pw', confirmPassword: 'old-pw' },
	{ id: 2, name: 'Bob', password: 'old-pw', confirmPassword: 'old-pw' },
]
const COLUMNS = createColumns<Row>([
	{ accessorKey: 'name' },
	{ accessorKey: 'password' },
	{ accessorKey: 'confirmPassword' },
])

const noopSave = (): Promise<void> => Promise.resolve()

describe('EditingFeature — basic flow', () => {
	it('initial state', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		const s = table.editing.getState()
		expect(s.rowId).toBe(null)
		expect(s.cellId).toBe(null)
		expect(s.values).toEqual({})
		expect(s.errors).toEqual({})
		expect(s.formError).toBe(null)
		expect(s.commitStatus).toBe('idle')
	})

	it('start(rowId) snapshots row values into editing state', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		table.editing.start('1')
		const s = table.editing.getState()
		expect(s.rowId).toBe('1')
		expect(s.values.name).toBe('Alice')
		expect(s.values.password).toBe('old-pw')
	})

	it('startCell snapshots only the requested column', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		table.editing.startCell('1', 'name')
		const s = table.editing.getState()
		expect(s.rowId).toBe('1')
		expect(s.cellId).toBe('1_name')
		expect(s.values).toEqual({ name: 'Alice' })
	})

	it('cancel resets state', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		table.editing.start('1')
		table.editing.setValue('name', 'changed')
		table.editing.setFormError('boom')
		table.editing.cancel()
		const s = table.editing.getState()
		expect(s.rowId).toBe(null)
		expect(s.values).toEqual({})
		expect(s.formError).toBe(null)
	})

	it('setValue updates immutably and clears that field error', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		table.editing.start('1')
		table.editing.setErrors({ name: ['too short'], password: ['weak'] })
		table.editing.setValue('name', 'Carol')
		const s = table.editing.getState()
		expect(s.values.name).toBe('Carol')
		expect(s.errors.name).toBeUndefined()
		expect(s.errors.password).toEqual(['weak'])
	})

	it('row.getIsEditing reflects current rowId', () => {
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		const row = table.getRowModel().rows[0]
		if (!row) throw new Error('expected row')
		expect(row.getIsEditing()).toBe(false)
		table.editing.start(row.id)
		expect(row.getIsEditing()).toBe(true)
	})
})

describe('EditingFeature — commit pipeline (row mode)', () => {
	it('commit() success: validates, saves, resets state', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave } })
		table.editing.start('1')
		table.editing.setValue('name', 'Alice 2')
		await table.editing.commit()

		expect(onSave).toHaveBeenCalledTimes(1)
		const [ctx] = onSave.mock.calls[0] as [{ rowId: string; values: Partial<Row>; signal: AbortSignal }]
		expect(ctx.rowId).toBe('1')
		expect(ctx.values.name).toBe('Alice 2')
		expect(ctx.signal).toBeInstanceOf(AbortSignal)

		const s = table.editing.getState()
		expect(s.rowId).toBe(null)
		expect(s.commitStatus).toBe('idle')
	})

	it('commit() with sync validate fail: errors set, form stays open', async () => {
		const validate = vi.fn().mockReturnValue({ errors: { name: ['too short'] } })
		const onSave = vi.fn().mockResolvedValue(undefined)
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { validate, onSave } })
		table.editing.start('1')
		await table.editing.commit()

		expect(onSave).not.toHaveBeenCalled()
		const s = table.editing.getState()
		expect(s.rowId).toBe('1')
		expect(s.errors.name).toEqual(['too short'])
		expect(s.commitStatus).toBe('idle')
	})

	it('commit() onSave throws ValidationError: errors + formError set', async () => {
		const onSave = vi.fn(() =>
			Promise.reject(
				new ValidationError({
					errors: { name: ['Already taken'] },
					formError: 'Could not save',
				}),
			),
		)
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave } })
		table.editing.start('1')
		await table.editing.commit()

		const s = table.editing.getState()
		expect(s.rowId).toBe('1')
		expect(s.errors.name).toEqual(['Already taken'])
		expect(s.formError).toBe('Could not save')
	})

	it('commit() onSave throws non-validation Error: formError = generic, error rethrown', async () => {
		const boom = new Error('network')
		const onSave = vi.fn(() => Promise.reject(boom))
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave } })
		table.editing.start('1')
		await expect(table.editing.commit()).rejects.toBe(boom)

		const s = table.editing.getState()
		expect(s.formError).toBe('Unexpected error')
		expect(s.commitStatus).toBe('idle')
	})

	it('cancel during async onSave aborts: late onSave does not write to state', async () => {
		const onSave = vi.fn(
			(ctx: { rowId: string; values: Partial<Row>; signal: AbortSignal }) =>
				new Promise<void>((resolve) => {
					ctx.signal.addEventListener('abort', () => {
						resolve()
					})
				}),
		)
		const table = createTable({ data: DATA, columns: COLUMNS, editing: { onSave } })
		table.editing.start('1')
		const p = table.editing.commit()
		await Promise.resolve()
		await Promise.resolve()
		table.editing.cancel()
		await p
		expect(table.editing.getState().rowId).toBe(null)
	})
})

describe('EditingFeature — cell mode', () => {
	it('startCell + commitCell: onSave receives only edited column', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'cell', onSave },
		})
		table.editing.startCell('1', 'name')
		table.editing.setValue('name', 'Alice 2')
		await table.editing.commitCell()

		expect(onSave).toHaveBeenCalledTimes(1)
		const [ctx] = onSave.mock.calls[0] as [{ rowId: string; values: Partial<Row> }]
		expect(ctx.rowId).toBe('1')
		expect(ctx.values).toEqual({ name: 'Alice 2' })
	})

	it('commitCell passes ctx.cell.columnId to validate', async () => {
		const seen: ValidateContext[] = []
		const validate = vi.fn((_v: Partial<Row>, ctx: ValidateContext) => {
			seen.push(ctx)
			return null
		})
		const onSave = vi.fn().mockResolvedValue(undefined)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'cell', validate, onSave },
		})
		table.editing.startCell('1', 'password')
		table.editing.setValue('password', 'new-pw')
		await table.editing.commitCell()

		expect(seen).toHaveLength(1)
		expect(seen[0]?.cell).toEqual({ columnId: 'password' })
	})

	it('commitCell applies only the edited column error; ignores cross-field errors', async () => {
		const validate = vi.fn().mockReturnValue({
			errors: { password: ['weak'], confirmPassword: ['mismatch'] },
		})
		const onSave = vi.fn().mockResolvedValue(undefined)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'cell', validate, onSave },
		})
		table.editing.startCell('1', 'password')
		table.editing.setValue('password', 'abc')
		await table.editing.commitCell()

		const s = table.editing.getState()
		expect(s.errors.password).toEqual(['weak'])
		// other field errors must NOT leak into cell-mode UI
		expect(s.errors.confirmPassword).toBeUndefined()
		expect(onSave).not.toHaveBeenCalled()
	})

	it('commitCell: validate ctx.cell allows user to skip cross-field refine', async () => {
		// Simulates user-controlled refine: when ctx.cell is set, return ok unconditionally.
		const validate = vi.fn((values: Partial<Row>, ctx: ValidateContext) => {
			if (ctx.cell) return null // skip cross-field
			if (values.password !== values.confirmPassword) {
				return { errors: { confirmPassword: ['mismatch'] } }
			}
			return null
		})
		const onSave = vi.fn().mockResolvedValue(undefined)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'cell', validate, onSave },
		})
		table.editing.startCell('1', 'password')
		table.editing.setValue('password', 'changed-only-here')
		await table.editing.commitCell()

		expect(onSave).toHaveBeenCalledTimes(1)
		expect(table.editing.getState().rowId).toBe(null)
	})

	it('cancel during async cell commit aborts the controller', async () => {
		let observedAbort = false
		const onSave = vi.fn(
			(ctx: { rowId: string; values: Partial<Row>; signal: AbortSignal }) =>
				new Promise<void>((resolve) => {
					ctx.signal.addEventListener('abort', () => {
						observedAbort = true
						resolve()
					})
				}),
		)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { mode: 'cell', onSave },
		})
		table.editing.startCell('1', 'name')
		table.editing.setValue('name', 'Alice 2')
		const p = table.editing.commitCell()
		await Promise.resolve()
		await Promise.resolve()
		table.editing.cancel()
		await p
		expect(observedAbort).toBe(true)
	})
})

describe('EditingFeature — validate config variants', () => {
	it('schema-shorthand', async () => {
		const schema = z.object({
			name: z.string().min(2, 'too short'),
		})
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { validate: { schema }, onSave: noopSave },
		})
		table.editing.start('1')
		table.editing.setValue('name', 'a')
		await table.editing.commit()
		expect(table.editing.getState().errors.name).toEqual(['too short'])
	})

	it('multi-message preserved', async () => {
		const schema = z.object({
			password: z.string().min(8, 'too short').regex(/[A-Z]/, 'needs uppercase'),
		})
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			editing: { validate: { schema }, onSave: noopSave },
		})
		table.editing.start('1')
		table.editing.setValue('password', 'abc')
		await table.editing.commit()
		const errs = table.editing.getState().errors.password ?? []
		expect(errs).toContain('too short')
		expect(errs).toContain('needs uppercase')
	})
})

describe('EditingFeature — per-column validateOn', () => {
	it("validateOn: 'change' triggers field-level validate after debounce", async () => {
		const validate = vi.fn((values: Partial<Row>, _ctx: ValidateContext) =>
			values.name === 'taken' ? { errors: { name: ['Already taken'] } } : null,
		)
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name', editing: { validateOn: 'change', validateDebounceMs: 20 } },
				{ accessorKey: 'password' },
				{ accessorKey: 'confirmPassword' },
			]),
			editing: { validate, onSave: noopSave },
		})
		table.editing.start('1')
		table.editing.setValue('name', 't')
		table.editing.setValue('name', 'ta')
		table.editing.setValue('name', 'taken')
		await new Promise<void>((r) => {
			setTimeout(r, 60)
		})
		const calls = validate.mock.calls.filter((c) => c[1].cell?.columnId === 'name')
		expect(calls.length).toBe(1)
		expect(table.editing.getState().errors.name).toEqual(['Already taken'])
	})

	it("validateOn: 'blur' does NOT auto-trigger on setValue", async () => {
		const validate = vi.fn().mockReturnValue(null)
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name', editing: { validateOn: 'blur' } },
				{ accessorKey: 'password' },
				{ accessorKey: 'confirmPassword' },
			]),
			editing: { validate, onSave: noopSave },
		})
		table.editing.start('1')
		table.editing.setValue('name', 'X')
		await new Promise<void>((r) => {
			setTimeout(r, 30)
		})
		expect(validate).not.toHaveBeenCalled()
	})
})
