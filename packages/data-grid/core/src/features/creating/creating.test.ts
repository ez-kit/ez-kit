import { rowExpandingFeature, rowPaginationFeature, rowSelectionFeature, tableFeatures } from '@tanstack/table-core'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'
import { ValidationError } from '../validation'

import { creatingFeature } from './creating'

import type { CreatingState } from './creating'
import type { ValidateContext } from '../validation'

type Row = {
	id: number
	name: string
	email: string
}

const DATA: Row[] = [{ id: 1, name: 'Alice', email: 'a@b.co' }]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name' }, { accessorKey: 'email' }])

const noop = (): void => {}

const CREATING = tableFeatures({ creatingFeature })

/**
 * The slice the table currently holds. From a test the feature set is resolved, so this reads the
 * atom directly — `../../feature-state` is for feature code, where it is not.
 */
const creatingOf = (table: { atoms: { creating: { get: () => CreatingState } } }): CreatingState =>
	table.atoms.creating.get()

describe('creatingFeature — feature composition', () => {
	it('contributes neither the slice nor table.creating without the feature', () => {
		// D1, demonstrated: omit the feature and the grid has neither of its two surfaces. This is
		// the cheapest guard against the migration's signature defect — a member that silently
		// stops being installed.
		//
		// Each read is a `@ts-expect-error`, which is the type half of the same claim: with the
		// feature out of the set these members do not *exist* on the table, and the directive fails
		// the build the day one of them starts existing unconditionally again.
		const table = createTable({ features: tableFeatures({}), data: DATA, columns: COLUMNS })

		// @ts-expect-error — the `creating` atom belongs to `creatingFeature`
		expect(table.atoms.creating).toBeUndefined()
		// @ts-expect-error — so does `table.creating`
		expect(table.creating).toBeUndefined()
		// @ts-expect-error — and the abort box behind it
		expect(table._creatingAbort).toBeUndefined()
	})

	it('installs both declared table members, and getState reads the real atom', () => {
		// `table.creating` and `_creatingAbort` go in through `initTableInstanceData`, because
		// `assignTableAPIs` installs one *function* per key and `creating` is a namespace object.
		const table = createTable({
			features: CREATING,
			data: DATA,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})

		expect(typeof table.creating.commit).toBe('function')
		expect(table._creatingAbort).toEqual({})

		// `getState()` is not a private mirror: it resolves to the same slice the atom holds, so
		// every assertion written through the public method below is an assertion about state.
		table.creating.start()
		expect(table.creating.getState()).toBe(creatingOf(table))
		expect(creatingOf(table).isOpen).toBe(true)
	})

	it('the empty-form constant is shared by reference across tables, and frozen', () => {
		// `cancel` and a successful `commit` write `{ ...INITIAL_STATE }` — a *shallow* copy — so
		// the `values` and `errors` a closed form holds are the constant's own objects, where v8
		// wrote a fresh `{}` at each site. The first assertion is that aliasing, demonstrated
		// rather than asserted in a comment: two independent tables end up holding **one** object.
		// The rest is what makes that safe.
		// Read through the typed `creatingOf` rather than `getState()`: identical values (the
		// composition case above pins that with `toBe`), and it names the slice type at the read
		// site. It was originally written this way to dodge `no-unsafe-*` on a table that resolved
		// to `any`; that reason is spent — `DataTable` resolves — and the helper is kept on its
		// own merit.
		const open = () => {
			const t = createTable({
				features: CREATING,
				data: DATA,
				columns: COLUMNS,
				creating: { onSave: () => Promise.resolve() },
			})
			t.creating.start()
			t.creating.setValue('name', 'typed')
			t.creating.cancel()
			return t
		}

		const a = open()
		const b = open()

		expect(creatingOf(a).values).toBe(creatingOf(b).values)
		expect(Object.isFrozen(creatingOf(a).values)).toBe(true)
		expect(Object.isFrozen(creatingOf(a).errors)).toBe(true)

		// The slice object itself is a fresh copy at every write, so it is deliberately NOT frozen
		// — only the nested objects that travel by reference are.
		expect(Object.isFrozen(creatingOf(a))).toBe(false)

		// And the shared objects still behave as empty state for both tables: a write through the
		// public API replaces them rather than mutating them.
		a.creating.start()
		a.creating.setValue('name', 'again')
		expect(creatingOf(a).values).toEqual({ name: 'again' })
		expect(creatingOf(b).values).toEqual({})
	})

	it('table.reset() closes the form through state, and the hook aborts the in-flight save', () => {
		// Both halves of the reset contract, driven through the real `table.reset()` rather than
		// by calling the hook directly — so the **ordering** is pinned by the test rather than
		// asserted in a comment. `table_reset` writes every key of `table.initialState` back
		// through `baseAtoms` in one batch, and only then loops the features' reset hooks:
		//
		//   1. the state pass restores `creating` to INITIAL_STATE — the open form closes, and
		//      this feature writes no code for that beyond seeding `getInitialState`;
		//   2. `resetTableInstanceData` does the part state restoration cannot — tears down the
		//      in-flight AbortController, so a late `onSave` resolution writes nothing.
		//
		// v8 had neither: the controller lived in a closure no reset hook could reach.
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
		const table = createTable({ features: CREATING, data: DATA, columns: COLUMNS, creating: { onSave } })
		table.creating.start()
		table.creating.setValue('name', 'Bob')
		expect(creatingOf(table).isOpen).toBe(true)
		const p = table.creating.commit()

		return Promise.resolve()
			.then(() => Promise.resolve())
			.then(() => {
				table.reset()

				// 1 — state: the form is closed, by the reset pass, not by this feature.
				expect(creatingOf(table).isOpen).toBe(false)
				expect(creatingOf(table).values).toEqual({})

				// 2 — instance data: only the hook could have done this.
				expect(observedAbort).toBe(true)
				expect(table._creatingAbort.controller).toBeUndefined()
				return p
			})
	})
})

describe('creatingFeature — basic flow', () => {
	it('initial state', () => {
		const table = createTable({
			features: CREATING,
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
			features: CREATING,
			data: DATA,
			columns: COLUMNS,
			creating: { onSave: () => Promise.resolve() },
		})
		table.creating.start()
		expect(table.creating.getState().isOpen).toBe(true)
	})

	it('cancel() resets state', () => {
		const table = createTable({
			features: CREATING,
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
			features: CREATING,
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
			features: CREATING,
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
		const table = createTable({ features: CREATING, data: DATA, columns: COLUMNS })
		await expect(table.creating.commit()).resolves.toBeUndefined()
	})
})

describe('creatingFeature — commit pipeline', () => {
	it('commit() success: cycles status idle→validating→saving→idle and resets state', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		const statuses: string[] = []

		const table = createTable({
			features: CREATING,
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
			features: CREATING,
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
			features: CREATING,
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
			features: CREATING,
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
			features: CREATING,
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
			features: CREATING,
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
			features: CREATING,
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
			features: CREATING,
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

describe('creatingFeature — validate config variants', () => {
	it('schema-shorthand works the same as function form', async () => {
		const schema = z.object({ email: z.email() })

		const table = createTable({
			features: CREATING,
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
		const table = createTable<typeof CREATING, PwRow>({
			features: CREATING,
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
			features: CREATING,
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

describe('creatingFeature — per-column validateOn', () => {
	it("column validateOn = 'change' triggers field-level validate after debounce", async () => {
		const validate = vi.fn((values: Partial<Row>, _ctx: ValidateContext) =>
			values.email === 'taken@x.co' ? { errors: { email: ['taken'] } } : null,
		)
		const table = createTable({
			features: CREATING,
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name' },
				{ accessorKey: 'email', creating: { validateOn: 'change', debounce: 20 } },
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
			features: CREATING,
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

	it("column validateOn = 'blur' does NOT auto-trigger on setValue", async () => {
		const validate = vi.fn().mockReturnValue(null)
		const table = createTable({
			features: CREATING,
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name' },
				{ accessorKey: 'email', creating: { validateOn: 'blur' } },
			]),
			creating: { validate, onSave: () => Promise.resolve() },
		})
		table.creating.start()
		table.creating.setValue('email', 'x')
		await new Promise<void>((r) => setTimeout(r, 30))

		expect(validate).not.toHaveBeenCalled()
	})
})

describe('creatingFeature — abort propagation', () => {
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
			features: CREATING,
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
		const table = createTable({ features: CREATING, data: DATA, columns: COLUMNS })
		table.creating.start()
		table.creating.setValue('name', 'X')
		await table.creating.commit()
		// no creating config → no-op
		expect(table.creating.getState().isOpen).toBe(true)
		noop()
	})
})

describe('creatingFeature — default values', () => {
	it('applies a column-level defaultValue on start()', () => {
		const table = createTable({
			features: CREATING,
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
			features: CREATING,
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
			features: CREATING,
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
			features: CREATING,
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
		// `rowPaginationFeature` beside `creatingFeature`, and it is load-bearing: under v9
		// `getRowCount` is installed by that feature, not by the core, so the documented
		// `defaultValue: ({ table }) => table.getRowCount() + 1`
		// (`apps/docs/content/docs/data-grid/editing/creating.mdx:60`) throws on a table whose
		// feature set omits pagination. v8 had it unconditionally.
		const table = createTable({
			features: tableFeatures({ creatingFeature, rowPaginationFeature }),
			data: DATA,
			columns: COLUMNS,
			creating: {
				// `ctx.table` names the real `Table<TableFeatures, TRow & object>` now, so the cast
				// that stood here is gone and `getRowCount()` is a checked call — which is the
				// point of this case: the method exists only where `rowPaginationFeature` is
				// registered, and the all-in instantiation this context carries is what says so.
				defaultValues: (ctx) => ({
					name: `Row ${String(ctx.table.getRowCount() + 1)}`,
				}),
				onSave: () => Promise.resolve(),
			},
		})
		table.creating.start()
		expect(table.creating.getState().values).toEqual({ name: 'Row 2' })
	})

	it('re-applies defaults on a second start() after cancel()', () => {
		let calls = 0
		const table = createTable({
			features: CREATING,
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
		// The selection and expanding features are in the set on purpose: without them
		// `createTable` warns that the two options have no effect and adds **no system columns at
		// all**, so the case would assert the absence of columns that were never built. The
		// explicit "the grid has some" assertion below is what makes the second one a statement
		// about system columns rather than about an empty set.
		//
		// Note this still does not make the `isSystemColumn` skip in `resolveDefaultValues` the
		// only thing keeping the case green — a system column also carries no `meta.creating`, so
		// the "no default value" branch would exclude it anyway. Deleting the skip leaves the case
		// passing; I checked. It is defence in depth, and this case characterises the documented
		// behaviour rather than one branch of the implementation.
		const table = createTable({
			features: tableFeatures({ creatingFeature, rowSelectionFeature, rowExpandingFeature }),
			data: DATA,
			columns: createColumns<Row>([{ accessorKey: 'name', creating: { defaultValue: 'Anonymous' } }]),
			selection: true,
			expanding: true,
			creating: { onSave: () => Promise.resolve() },
		})

		// No annotation and no cast: `getAllColumns()` yields real columns whose `meta` is this
		// package's own declaration merge, so `isSystemColumn` is a checked read.
		const systemColumns = table.getAllColumns().filter((c) => c.columnDef.meta?.isSystemColumn === true)
		expect(systemColumns.length).toBeGreaterThan(0)

		table.creating.start()
		expect(Object.keys(table.creating.getState().values)).toEqual(['name'])
	})

	it('errors, formError and commitStatus still reset on start()', () => {
		const table = createTable({
			features: CREATING,
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
