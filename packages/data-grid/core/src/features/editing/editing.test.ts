import { tableFeatures } from '@tanstack/table-core'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'
import { ValidationError } from '../validation'

import { editingFeature } from './editing'

import type { EditingState } from './editing'
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

const EDITING = tableFeatures({ editingFeature })

/** The slice the table currently holds. From a test the feature set is resolved, so this reads
 * the atom directly — `../../feature-state` is for feature code, where it is not. */
const editingOf = (table: { atoms: { editing: { get: () => EditingState } } }): EditingState =>
	table.atoms.editing.get()

describe('editingFeature — feature composition', () => {
	it('contributes neither the slice, nor table.editing, nor row.getIsEditing without the feature', () => {
		// D1, demonstrated: omit the feature and the grid has none of its three surfaces. This is
		// the cheapest guard against the migration's signature defect — a member that silently
		// stops being installed.
		//
		// Each read is a `@ts-expect-error`, which is the type half of the same claim: with the
		// feature out of the set these members do not *exist* on the table, and the directive fails
		// the build the day one of them starts existing unconditionally again.
		const table = createTable({ features: tableFeatures({}), data: DATA, columns: COLUMNS })

		// @ts-expect-error — the `editing` atom belongs to `editingFeature`
		expect(table.atoms.editing).toBeUndefined()
		// @ts-expect-error — so does `table.editing`
		expect(table.editing).toBeUndefined()
		// @ts-expect-error — and the abort box behind it
		expect(table._editingAbort).toBeUndefined()

		const row = table.getRowModel().rows[0]
		if (!row) throw new Error('expected row')
		expect((row as { getIsEditing?: unknown }).getIsEditing).toBeUndefined()
	})

	it('installs both declared table members, and getState reads the real atom', () => {
		// `table.editing` and `_editingAbort` go in through `initTableInstanceData`, because
		// `assignTableAPIs` installs one *function* per key and `editing` is a namespace object.
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })

		expect(typeof table.editing.commit).toBe('function')
		expect(table._editingAbort).toEqual({})

		// `getState()` is not a private mirror: it resolves to the same slice the atom holds, so
		// every assertion written through the public method below is an assertion about state.
		table.editing.start('1')
		expect(table.editing.getState()).toBe(editingOf(table))
		expect(editingOf(table).rowId).toBe('1')
	})

	it('the empty-form constant is shared by reference across tables, and frozen', () => {
		// `cancel`, `commit` and `commitCell` write `{ ...INITIAL_STATE }` — a *shallow* copy — so
		// the `values` and `errors` a closed form holds are the constant's own objects, where v8
		// wrote a fresh `{}` at each site. The first assertion is that aliasing, demonstrated
		// rather than asserted in a comment: two independent tables end up holding **one** object.
		// The rest is what makes that safe.
		//
		// Read through the typed `editingOf` rather than `getState()` — identical values (the case
		// above pins that with `toBe`), and it names the slice type at the read site. The original
		// reason, `no-unsafe-*` on a table that resolved to `any`, is spent; the helper is kept on
		// its own merit.
		//
		// Carried across from `creating.test.ts`: the two features hold the identical constant and
		// the identical hazard, so they hold the identical guard.
		const open = () => {
			const t = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
			t.editing.start('1')
			t.editing.setValue('name', 'typed')
			t.editing.cancel()
			return t
		}

		const a = open()
		const b = open()

		expect(editingOf(a).values).toBe(editingOf(b).values)
		expect(Object.isFrozen(editingOf(a).values)).toBe(true)
		expect(Object.isFrozen(editingOf(a).errors)).toBe(true)

		// The slice object itself is a fresh copy at every write, so it is deliberately NOT frozen
		// — only the nested objects that travel by reference are.
		expect(Object.isFrozen(editingOf(a))).toBe(false)

		// And the shared objects still behave as empty state for both tables: a write through the
		// public API replaces them rather than mutating them.
		a.editing.start('1')
		a.editing.setValue('name', 'again')
		expect(editingOf(a).values.name).toBe('again')
		expect(editingOf(b).values).toEqual({})
	})

	it('table.reset() closes the form through state, and the hook aborts the in-flight save', () => {
		// Both halves of the reset contract, driven through the real `table.reset()` rather than
		// by calling the hook directly — so the **ordering** is pinned by the test rather than
		// asserted in a comment. `table_reset` writes every key of `table.initialState` back
		// through `baseAtoms` in one batch, and only then loops the features' reset hooks:
		//
		//   1. the state pass restores `editing` to INITIAL_STATE — the open form closes, and
		//      this feature writes no code for that beyond seeding `getInitialState`;
		//   2. `resetTableInstanceData` does the part state restoration cannot — tears down the
		//      in-flight AbortController, so a late `onSave` resolution writes nothing.
		//
		// v8 had neither: the controller lived in a closure no reset hook could reach.
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
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave } })
		table.editing.start('1')
		expect(editingOf(table).rowId).toBe('1')
		const p = table.editing.commit()

		return Promise.resolve()
			.then(() => Promise.resolve())
			.then(() => {
				table.reset()

				// 1 — state: the form is closed, by the reset pass, not by this feature.
				expect(editingOf(table).rowId).toBe(null)
				expect(editingOf(table).values).toEqual({})

				// 2 — instance data: only the hook could have done this.
				expect(observedAbort).toBe(true)
				expect(table._editingAbort.controller).toBeUndefined()
				return p
			})
	})
})

describe('editingFeature — basic flow', () => {
	it('initial state', () => {
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		const s = table.editing.getState()
		expect(s.rowId).toBe(null)
		expect(s.cellId).toBe(null)
		expect(s.values).toEqual({})
		expect(s.errors).toEqual({})
		expect(s.formError).toBe(null)
		expect(s.commitStatus).toBe('idle')
	})

	it('start(rowId) snapshots row values into editing state', () => {
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		table.editing.start('1')
		const s = table.editing.getState()
		expect(s.rowId).toBe('1')
		expect(s.values.name).toBe('Alice')
		expect(s.values.password).toBe('old-pw')
	})

	it('startCell snapshots only the requested column', () => {
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		table.editing.startCell('1', 'name')
		const s = table.editing.getState()
		expect(s.rowId).toBe('1')
		expect(s.cellId).toBe('1_name')
		expect(s.values).toEqual({ name: 'Alice' })
	})

	it('cancel resets state', () => {
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
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
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		table.editing.start('1')
		table.editing.setErrors({ name: ['too short'], password: ['weak'] })
		table.editing.setValue('name', 'Carol')
		const s = table.editing.getState()
		expect(s.values.name).toBe('Carol')
		expect(s.errors.name).toBeUndefined()
		expect(s.errors.password).toEqual(['weak'])
	})

	it('row.getIsEditing reflects current rowId', () => {
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		const row = table.getRowModel().rows[0]
		if (!row) throw new Error('expected row')
		expect(row.getIsEditing()).toBe(false)
		table.editing.start(row.id)
		expect(row.getIsEditing()).toBe(true)
	})
})

describe('editingFeature — row.getIsEditing, the one prototype-bound method', () => {
	const makeRows = () => {
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave: noopSave } })
		const [first, second] = table.getRowModel().rows
		if (!first || !second) throw new Error('expected two rows')
		return { table, first, second }
	}

	it('receives the row as its first argument, not the table', () => {
		// The trap this task exists to avoid. `assignTableAPIs` installs `fn` **verbatim**;
		// `assignPrototypeAPIs` installs `function (...args) { return fn(this, ...args) }` in the
		// plain branch and `fn(self, ...deps)` in the memoized one — both prepend the instance. A
		// closure-shaped `fn` copied from a table feature would put every argument off by one, and
		// nothing would say so: `PrototypeAPI.fn` is typed `(self: any, ...args: any) => any`.
		//
		// This is the proof, not a reading of it. `getIsEditing` is ONE shared function object on
		// the prototype, so nothing is captured per row; the only thing that can distinguish the
		// two rows is the argument `fn` is handed. Applying that single function with each row as
		// `this` and getting different answers is exactly the statement "`fn` receives the row".
		const { table, first, second } = makeRows()
		const proto = Object.getPrototypeOf(first) as { getIsEditing: () => boolean }

		expect(Object.getPrototypeOf(second)).toBe(proto)
		expect(proto.getIsEditing).toBe(first.getIsEditing)
		expect(proto.getIsEditing).toBe(second.getIsEditing)

		table.editing.start(second.id)

		expect(Reflect.apply(proto.getIsEditing, first, [])).toBe(false)
		expect(Reflect.apply(proto.getIsEditing, second, [])).toBe(true)
	})

	it('reaches the table through row.table, so the method captures nothing', () => {
		// Route B, as every stock feature does. Had `fn` been written table-first, `row.table`
		// would be `undefined` here and the read would throw rather than answer.
		const { first } = makeRows()
		expect((first as { table?: unknown }).table).toBeDefined()
		expect(first.getIsEditing()).toBe(false)
	})

	it('is on the prototype, so it does not survive a spread', () => {
		// Design §2's audit, made a test rather than a comment: prototype-bound methods break
		// under destructuring, spreading, `Object.keys` and `JSON.stringify`. `getIsEditing` is
		// our only such method, and design §7 records that nothing in the React package
		// destructures or bare-passes a row method today. This is what keeps that true.
		const { first } = makeRows()

		expect(typeof first.getIsEditing).toBe('function')
		expect(Object.hasOwn(first, 'getIsEditing')).toBe(false)
		expect(Object.keys(first)).not.toContain('getIsEditing')
		expect({ ...first }.getIsEditing).toBeUndefined()
		expect(JSON.parse(JSON.stringify({ getIsEditing: first.getIsEditing }))).toEqual({})

		// Bound callback passing still works, because `fn` reads the row it is given.
		const bound = first.getIsEditing.bind(first)
		expect(bound()).toBe(false)
	})
})

describe('editingFeature — commit pipeline (row mode)', () => {
	it('commit() success: validates, saves, resets state', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave } })
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
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { validate, onSave } })
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
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave } })
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
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave } })
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
		const table = createTable({ features: EDITING, data: DATA, columns: COLUMNS, editing: { onSave } })
		table.editing.start('1')
		const p = table.editing.commit()
		await Promise.resolve()
		await Promise.resolve()
		table.editing.cancel()
		await p
		expect(table.editing.getState().rowId).toBe(null)
	})
})

describe('editingFeature — cell mode', () => {
	it('startCell + commitCell: onSave receives only edited column', async () => {
		const onSave = vi.fn().mockResolvedValue(undefined)
		const table = createTable({
			features: EDITING,
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
			features: EDITING,
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
			features: EDITING,
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
			features: EDITING,
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
			features: EDITING,
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

describe('editingFeature — validate config variants', () => {
	it('schema-shorthand', async () => {
		const schema = z.object({
			name: z.string().min(2, 'too short'),
		})
		const table = createTable({
			features: EDITING,
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
			features: EDITING,
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

describe('editingFeature — per-column validateOn', () => {
	it("validateOn: 'change' triggers field-level validate after debounce", async () => {
		const validate = vi.fn((values: Partial<Row>, _ctx: ValidateContext) =>
			values.name === 'taken' ? { errors: { name: ['Already taken'] } } : null,
		)
		const table = createTable({
			features: EDITING,
			data: DATA,
			columns: createColumns<Row>([
				{ accessorKey: 'name', editing: { validateOn: 'change', debounce: 20 } },
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
			features: EDITING,
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
