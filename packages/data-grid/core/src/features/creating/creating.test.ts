import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'
import { ValidationError } from '../validation'

import type { ValidateContext } from '../validation'

type Row = {
	id: number
	name: string
	email: string
}

const DATA: Row[] = [{ id: 1, name: 'Alice', email: 'a@b.co' }]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name' }, { accessorKey: 'email' }])

const noop = (): void => {}

describe('CreatingFeature — basic flow', () => {
	it('initial state', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})
		const state = table.creating.getState()
		expect(state.isOpen).toBe(false)
		expect(state.values).toEqual({})
		expect(state.errors).toEqual({})
		expect(state.formError).toBe(null)
		expect(state.commitStatus).toBe('idle')
	})

	it('start() opens the form', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		expect(table.creating.getState().isOpen).toBe(true)
	})

	it('cancel() resets state', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		table.creating.setValue('name', 'Bob')
		table.creating.setFormError('boom')
		table.creating.cancel()
		const s = table.creating.getState()
		expect(s.isOpen).toBe(false)
		expect(s.values).toEqual({})
		expect(s.formError).toBe(null)
	})

	it('setValue updates values immutably and clears that field error', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		table.creating.setErrors({ name: ['required'], email: ['invalid'] })
		const before = table.creating.getState()

		table.creating.setValue('name', 'Carol')
		const after = table.creating.getState()

		expect(after.values.name).toBe('Carol')
		expect(after.errors.name).toBeUndefined()
		expect(after.errors.email).toEqual(['invalid']) // other field error preserved
		expect(after).not.toBe(before) // immutable
	})

	it('setValue does NOT clear formError', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		table.creating.setFormError('rate limited')
		table.creating.setValue('name', 'X')
		expect(table.creating.getState().formError).toBe('rate limited')
	})

	it('commit() resolves without error when no validate and no creating config absent', async () => {
		const table = createTable({ data: DATA, columns: COLUMNS })
		await expect(table.creating.commit()).resolves.toBeUndefined()
	})
})

describe('CreatingFeature — commit pipeline', () => {
	it('commit() success: cycles status idle→validating→saving→idle and resets state', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		const statuses: string[] = []

		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { onSave },
			onStateChange: () => {
				statuses.push(table.creating.getState().commitStatus)
			},
		})
		table.creating.start()
		table.creating.setValue('name', 'Dave')
		await table.creating.commit()

		expect(onSave).toHaveBeenCalledTimes(1)
		const [ctx] = onSave.mock.calls[0] as [{ values: Partial<Row>; signal: AbortSignal }]
		expect(ctx.values).toEqual({ name: 'Dave' })
		expect(ctx.signal).toBeInstanceOf(AbortSignal)

		// final state: isOpen = false, status idle, values cleared
		const s = table.creating.getState()
		expect(s.isOpen).toBe(false)
		expect(s.commitStatus).toBe('idle')

		// status transitions seen
		expect(statuses).toContain('validating')
		expect(statuses).toContain('saving')
	})

	it('commit() with sync validate fail: writes errors, status idle, form stays open', async () => {
		const validate = vi.fn().mockReturnValue({ errors: { name: ['required'] } })
		const onSave = vi.fn().mockResolvedValue(undefined)

		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { validate, onSave },
		})
		table.creating.start()
		await table.creating.commit()

		expect(onSave).not.toHaveBeenCalled()
		const s = table.creating.getState()
		expect(s.isOpen).toBe(true)
		expect(s.errors.name).toEqual(['required'])
		expect(s.commitStatus).toBe('idle')
	})

	it('commit() with async validate fail', async () => {
		const validate = vi.fn(() => Promise.resolve({ errors: { email: ['taken'] } }))
		const onSave = vi.fn().mockResolvedValue(undefined)

		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { validate, onSave },
		})
		table.creating.start()
		await table.creating.commit()

		expect(onSave).not.toHaveBeenCalled()
		expect(table.creating.getState().errors.email).toEqual(['taken'])
	})

	it('commit() validate ok → onSave called with signal', async () => {
		const validate = vi.fn().mockReturnValue(null)
		const onSave = vi.fn().mockResolvedValue(undefined)

		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { validate, onSave },
		})
		table.creating.start()
		await table.creating.commit()

		expect(validate).toHaveBeenCalledTimes(1)
		expect(onSave).toHaveBeenCalledTimes(1)
	})

	it('commit() onSave throws ValidationError → errors + formError set, form stays open', async () => {
		const onSave = vi.fn(() =>
			Promise.reject(
				new ValidationError({
					errors: { email: ['Already taken'] },
					formError: 'Could not save',
				}),
			),
		)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { onSave },
		})
		table.creating.start()
		await table.creating.commit()

		const s = table.creating.getState()
		expect(s.isOpen).toBe(true)
		expect(s.errors.email).toEqual(['Already taken'])
		expect(s.formError).toBe('Could not save')
		expect(s.commitStatus).toBe('idle')
	})

	it('commit() onSave throws non-validation Error → formError = generic, error rethrown', async () => {
		const boom = new Error('network down')
		const onSave = vi.fn(() => Promise.reject(boom))
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { onSave },
		})
		table.creating.start()
		await expect(table.creating.commit()).rejects.toBe(boom)

		const s = table.creating.getState()
		expect(s.formError).toBe('Unexpected error')
		expect(s.commitStatus).toBe('idle')
	})

	it('consecutive commits while saving: second is no-op', async () => {
		let release: (() => void) | undefined
		const onSave = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					release = resolve
				}),
		)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { onSave },
		})
		table.creating.start()
		const p1 = table.creating.commit()
		// status should be 'validating' or 'saving' — not idle
		await Promise.resolve()
		await Promise.resolve()
		expect(['validating', 'saving']).toContain(table.creating.getState().commitStatus)
		const p2 = table.creating.commit()
		release?.()
		await Promise.all([p1, p2])
		expect(onSave).toHaveBeenCalledTimes(1)
	})

	it('cancel() during async onSave aborts: late onSave does not write to state', async () => {
		let observedAbort = false
		const onSave = vi.fn(
			(ctx: { values: Partial<Row>; signal: AbortSignal }) =>
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
			creating: { onSave },
		})
		table.creating.start()
		const p = table.creating.commit()
		await Promise.resolve()
		await Promise.resolve()
		table.creating.cancel()
		await p
		expect(observedAbort).toBe(true)
		// state was already reset by cancel — late onSave didn't overwrite
		expect(table.creating.getState().isOpen).toBe(false)
	})
})

describe('CreatingFeature — validate config variants', () => {
	it('schema-shorthand works the same as function form', async () => {
		const schema = z.object({ email: z.email() })

		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: {
				validate: { schema },
				onSave: () => Promise.resolve(),
			},
		})
		table.creating.start()
		table.creating.setValue('email', 'not-an-email')
		await table.creating.commit()

		expect(table.creating.getState().errors.email).toBeDefined()
	})

	it('multi-message: zod min(8).regex preserves both messages', async () => {
		const schema = z.object({
			password: z.string().min(8, 'too short').regex(/[A-Z]/, 'needs uppercase'),
		})

		type PwRow = { id: number; password: string }
		const table = createTable<PwRow>({
			data: [{ id: 1, password: '' }],
			columns: createColumns<PwRow>([{ accessorKey: 'password' }]),
			creating: { validate: { schema }, onSave: () => Promise.resolve() },
		})
		table.creating.start()
		table.creating.setValue('password', 'abc')
		await table.creating.commit()

		const s = table.creating.getState()
		expect(s.errors.password).toContain('too short')
		expect(s.errors.password).toContain('needs uppercase')
	})

	it('validate() returns ValidationResult and applies state', async () => {
		const validate = vi.fn().mockReturnValue({ errors: { name: ['required'] } })
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { validate, onSave: () => Promise.resolve() },
		})
		table.creating.start()
		const result = await table.creating.validate()
		expect(result).toEqual({ errors: { name: ['required'] } })
		expect(table.creating.getState().errors.name).toEqual(['required'])
	})
})

describe('CreatingFeature — per-column validateOn', () => {
	it("meta.validateOn = 'change' triggers field-level validate after debounce", async () => {
		const validate = vi.fn((values: Partial<Row>, _ctx: ValidateContext) =>
			values.email === 'taken@x.co' ? { errors: { email: ['taken'] } } : null,
		)
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name' },
				{ accessorKey: 'email', validateOn: 'change', validateDebounceMs: 20 },
			]),
			creating: { validate, onSave: () => Promise.resolve() },
		})
		table.creating.start()
		table.creating.setValue('email', 't')
		table.creating.setValue('email', 'ta')
		table.creating.setValue('email', 'taken@x.co')

		// Wait past debounce window
		await new Promise<void>((r) => setTimeout(r, 60))

		// Single validate call survived debounce
		const callsForChange = validate.mock.calls.filter((c) => c[1].cell?.columnId === 'email')
		expect(callsForChange.length).toBe(1)
		expect(table.creating.getState().errors.email).toEqual(['taken'])
	})

	it('validateField writes only that column error, leaves others untouched', async () => {
		const validate = vi.fn().mockReturnValue({
			errors: { name: ['name-err'], email: ['email-err'] },
		})
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { validate, onSave: () => Promise.resolve() },
		})
		table.creating.start()
		table.creating.setErrors({ other: ['preserved'] })

		await table.creating.validateField('email')

		const s = table.creating.getState()
		expect(s.errors.email).toEqual(['email-err'])
		expect(s.errors.name).toBeUndefined() // not the field we validated
		expect(s.errors.other).toEqual(['preserved']) // unrelated, kept
	})

	it("meta.validateOn = 'blur' does NOT auto-trigger on setValue", async () => {
		const validate = vi.fn().mockReturnValue(null)
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'name' }, { accessorKey: 'email', validateOn: 'blur' }]),
			creating: { validate, onSave: () => Promise.resolve() },
		})
		table.creating.start()
		table.creating.setValue('email', 'x')
		await new Promise<void>((r) => setTimeout(r, 30))

		expect(validate).not.toHaveBeenCalled()
	})
})

describe('CreatingFeature — abort propagation', () => {
	it('cancel() during async validate aborts the signal seen by validate', async () => {
		let seenSignal: AbortSignal | undefined
		const validate = vi.fn(
			(_v: Partial<Row>, ctx: ValidateContext) =>
				new Promise<null>((resolve) => {
					seenSignal = ctx.signal
					ctx.signal.addEventListener('abort', () => {
						resolve(null)
					})
				}),
		)
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: { validate, onSave: () => Promise.resolve() },
		})
		table.creating.start()
		const p = table.creating.commit()
		await Promise.resolve()
		table.creating.cancel()
		await p
		expect(seenSignal?.aborted).toBe(true)
	})

	it('keeps form open and onSave() unsupported empty path call still works', async () => {
		// sanity — confirm noop side path
		const table = createTable({ data: DATA, columns: COLUMNS })
		table.creating.start()
		table.creating.setValue('name', 'X')
		await table.creating.commit()
		// no creating config → no-op
		expect(table.creating.getState().isOpen).toBe(true)
		noop()
	})
})

describe('CreatingFeature — default values', () => {
	it('applies a column-level defaultValue on start()', () => {
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name', creating: { defaultValue: 'Anonymous' } },
				{ accessorKey: 'email' },
			]),
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		expect(table.creating.getState().values).toEqual({ name: 'Anonymous' })
	})

	it('columns without a defaultValue contribute no key', () => {
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name', creating: { defaultValue: 'Anonymous' } },
				{ accessorKey: 'email', creating: { description: 'work address' } },
			]),
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		expect(Object.keys(table.creating.getState().values)).toEqual(['name'])
	})

	it('table-level defaultValues override column-level per key', () => {
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name', creating: { defaultValue: 'Anonymous' } },
				{ accessorKey: 'email', creating: { defaultValue: 'none@example.com' } },
			]),
			creating: { defaultValues: { name: 'Bob' }, onSave: () => Promise.resolve() },
		})
		table.creating.start()
		expect(table.creating.getState().values).toEqual({ name: 'Bob', email: 'none@example.com' })
	})

	it('column-level function form receives { table, columnId } and its return lands in values', () => {
		const defaultValue = vi.fn((ctx: { table: unknown; columnId: string }) => `row-${ctx.columnId}`)
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'name', creating: { defaultValue } }, { accessorKey: 'email' }]),
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		expect(defaultValue).toHaveBeenCalledTimes(1)
		expect(defaultValue.mock.calls[0]?.[0].table).toBe(table)
		expect(defaultValue.mock.calls[0]?.[0].columnId).toBe('name')
		expect(table.creating.getState().values).toEqual({ name: 'row-name' })
	})

	it('table-level function form receives { table } and sees live table state', () => {
		const table = createTable({
			data: DATA,
			columns: COLUMNS,
			creating: {
				defaultValues: (ctx) => ({ name: `Row ${String(ctx.table.getRowCount() + 1)}` }),
				onSave: () => Promise.resolve(),
			},
		})
		table.creating.start()
		expect(table.creating.getState().values).toEqual({ name: 'Row 2' })
	})

	it('re-applies defaults on a second start() after cancel()', () => {
		let calls = 0
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([
				{
					accessorKey: 'name',
					creating: {
						defaultValue: () => {
							calls += 1
							return `Draft ${String(calls)}`
						},
					},
				},
			]),
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		expect(table.creating.getState().values).toEqual({ name: 'Draft 1' })
		table.creating.setValue('name', 'typed over')
		table.creating.cancel()
		expect(table.creating.getState().values).toEqual({})
		table.creating.start()
		expect(table.creating.getState().values).toEqual({ name: 'Draft 2' })
	})

	it('system columns never contribute a key', () => {
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'name', creating: { defaultValue: 'Anonymous' } }]),
			selection: true,
			expanding: true,
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		expect(Object.keys(table.creating.getState().values)).toEqual(['name'])
	})

	it('errors, formError and commitStatus still reset on start()', () => {
		const table = createTable({
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'name', creating: { defaultValue: 'Anonymous' } }]),
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		table.creating.setErrors({ name: ['required'] })
		table.creating.setFormError('boom')
		table.creating.start()
		const s = table.creating.getState()
		expect(s.errors).toEqual({})
		expect(s.formError).toBe(null)
		expect(s.commitStatus).toBe('idle')
		expect(s.values).toEqual({ name: 'Anonymous' })
	})
})
