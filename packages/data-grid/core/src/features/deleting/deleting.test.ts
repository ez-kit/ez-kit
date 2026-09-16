import { constructTable, rowSelectionFeature, tableFeatures } from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'
import { describe, expect, it, vi } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable, createTableOptions } from '../../create-table'

import { deletingFeature } from './deleting'

import type { DeletingState } from './deleting'
import type { ExternalAtoms, RowSelectionState, TableFeatures, TableOptions } from '@tanstack/table-core'

type Row = {
	id: number
	name: string
}

const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name' }])

/** Deleting alone — the per-row half needs no selection. */
const DELETING = tableFeatures({ deletingFeature })

/** Deleting plus selection — every bulk case needs `rowSelection` to exist. */
const DELETING_SEL = tableFeatures({ deletingFeature, rowSelectionFeature })

/**
 * The slice the table currently holds.
 *
 * From a test the feature set is resolved, so this reads the atom directly — `../../feature-state`
 * is for feature code, where it is not. The composition case below pins with `toBe` that
 * `table.deleting.getState()` returns this same object, so the assertions written through the
 * public method are assertions about the atom.
 */
const deletingOf = (table: { atoms: { deleting: { get: () => DeletingState } } }): DeletingState =>
	table.atoms.deleting.get()

/**
 * Construct a table the way `createTable` does, but with a consumer-supplied `rowSelection` atom.
 *
 * `createTable` takes no `externals` — that parameter is `createTableOptions`' — so the two halves
 * are assembled here, exactly as `feature-state.test.ts` does it. This is what makes the
 * `writeForeignSlice` case below a real test of the foreign-write rule rather than of a slice that
 * happens to live in `baseAtoms`.
 */
function constructWithExternalAtoms<TFeatures extends TableFeatures>(
	features: TFeatures,
	atoms: ExternalAtoms<TFeatures>,
	/** Overrides merged over the default config — for a case that needs its own spy or bulk mode. */
	overrides: Partial<Parameters<typeof createTableOptions<TFeatures, Row>>[0]> = {},
) {
	const { options } = createTableOptions(
		{
			features,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), bulk: { onDelete: vi.fn() } },
			...overrides,
		},
		{ atoms },
	)
	return constructTable({
		...options,
		features: { coreReactivityFeature: storeReactivityBindings(), ...options.features },
	} as unknown as TableOptions<TFeatures, Row>)
}

/** A real `@tanstack/store` atom, reached through the binding table-core already re-exports. */
function externalAtom<T>(initial: T) {
	return storeReactivityBindings().createWritableAtom<T>(initial)
}

describe('deletingFeature — feature composition', () => {
	it('contributes neither the slice nor table.deleting without the feature', () => {
		// D1, demonstrated: omit the feature and the grid has neither of its surfaces. This is the
		// cheapest guard against the migration's signature defect — a member that silently stops
		// being installed.
		//
		// Each read is a `@ts-expect-error`, which is the type half of the same claim: with the
		// feature out of the set these members do not *exist* on the table, and the directive fails
		// the build the day one of them starts existing unconditionally again.
		const table = createTable({ features: tableFeatures({}), data: DATA, columns: COLUMNS })

		// @ts-expect-error — the `deleting` atom belongs to `deletingFeature`
		expect(table.atoms.deleting).toBeUndefined()
		// @ts-expect-error — so does `table.deleting`
		expect(table.deleting).toBeUndefined()
		// @ts-expect-error — and the abort box behind it
		expect(table._deletingAbort).toBeUndefined()
	})

	it('installs both declared table members, and getState reads the real atom', () => {
		// `table.deleting` and `_deletingAbort` go in through `initTableInstanceData`, because
		// `assignTableAPIs` installs one *function* per key and `deleting` is a namespace object
		// two levels deep (`table.deleting.bulk.confirm`).
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: vi.fn(), confirmation: true },
		})

		expect(typeof table.deleting.confirm).toBe('function')
		expect(typeof table.deleting.bulk.confirm).toBe('function')
		expect(table._deletingAbort).toEqual({})

		// `getState()` is not a private mirror: it resolves to the same slice the atom holds.
		table.deleting.request('1')
		expect(table.deleting.getState()).toBe(deletingOf(table))
		expect(deletingOf(table).pendingRowId).toBe('1')
	})

	it('table.reset() clears the staged delete through state, and the hook aborts the in-flight one', () => {
		// Both halves of the reset contract, driven through the real `table.reset()` rather than
		// by calling the hook directly — so the **ordering** is pinned by the test rather than
		// asserted in a comment. `table_reset` writes every key of `table.initialState` back
		// through `baseAtoms` in one batch, and only then loops the features' reset hooks:
		//
		//   1. the state pass restores `deleting` to INITIAL_STATE — the staged confirmation
		//      clears, and this feature writes no code for that beyond seeding `getInitialState`;
		//   2. `resetTableInstanceData` does the part state restoration cannot — tears down the
		//      in-flight AbortController, so a late `onDelete` resolution writes nothing.
		//
		// v8 had neither: the controller lived in a closure no reset hook could reach.
		let observedAbort = false
		const onDelete = vi.fn(
			(ctx: { signal: AbortSignal }) =>
				new Promise<void>((resolve) => {
					ctx.signal.addEventListener('abort', () => {
						observedAbort = true
						resolve()
					})
				}),
		)
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: true },
		})

		table.deleting.request('1')
		expect(deletingOf(table).pendingRowId).toBe('1')
		void table.deleting.delete('1')
		expect(onDelete).toHaveBeenCalledTimes(1)

		table.reset()

		// 1 — state: the staged row is cleared, by the reset pass, not by this feature.
		expect(deletingOf(table).pendingRowId).toBe(null)
		expect(deletingOf(table).pendingBulk).toBe(false)

		// 2 — instance data: only the hook could have done this.
		expect(observedAbort).toBe(true)
		expect(table._deletingAbort.controller).toBeUndefined()
	})

	it('each table gets its own idle slice, and every write replaces it rather than mutating it', () => {
		// What is actually observable about the closed-state constant, established by falsifying
		// the first version of this case rather than by reading the code: `constructTable`
		// deep-clones `initialState` (`cloneState`), so the frozen `INITIAL_STATE` never reaches a
		// table and two tables do **not** share a seed. That is the difference from `creating` and
		// `editing`, whose `cancel` writes `{ ...INITIAL_STATE }` at runtime and so really does
		// hand every table the constant's nested `values` / `errors`.
		//
		// What is left to pin is the immutability the slice depends on: `writeDeleting` builds a
		// new object at every write, so a previously-read slice is a stable snapshot. A mutating
		// writer would fail both identity assertions below.
		const mk = () =>
			createTable({
				features: DELETING,
				data: DATA,
				columns: COLUMNS,
				deleting: { onDelete: vi.fn(), confirmation: true },
			})

		const a = mk()
		const b = mk()

		expect(deletingOf(a)).not.toBe(deletingOf(b))
		expect(deletingOf(a)).toEqual(deletingOf(b))

		const before = deletingOf(a)
		a.deleting.request('1')

		expect(deletingOf(a)).not.toBe(before)
		expect(deletingOf(a).pendingRowId).toBe('1')
		// The snapshot taken before the write still reads as it did — it was replaced, not edited.
		expect(before.pendingRowId).toBe(null)
		expect(deletingOf(b).pendingRowId).toBe(null)
	})
})

describe('deletingFeature — the post-bulk deselect writes a slice it does not own', () => {
	it('clears the selection through a consumer-supplied rowSelection atom', async () => {
		// The rule `writeForeignSlice` exists for, proved end to end rather than in the module's
		// own unit test: when the consumer supplies the atom, `baseAtoms.rowSelection` is NOT the
		// owning atom, so a write aimed at it would move nothing anyone reads — silently. This is
		// that module's first real caller.
		const external = externalAtom<RowSelectionState>({ '1': true, '2': true })
		const table = constructWithExternalAtoms(DELETING_SEL, { rowSelection: external })

		await table.deleting.bulk.delete(['1', '2'])

		expect(external.get()).toEqual({})
	})

	it('a `false` entry in a consumer-owned selection is not a selected row', async () => {
		// The rule the `no-unnecessary-condition` disable in `selectedRowIds` was kept under, and
		// until now the disable was the only thing recording it: v9 narrowed `RowSelectionState`
		// to `Record<string, true>`, so the filter behind this reads as dead — but the atom here
		// is the **consumer's**, and nothing stops their writer putting a literal `false` in it.
		// Removing the filter makes row 2 a selected row, and `bulk.request()` deletes it.
		const onDelete = vi.fn()
		const external = externalAtom<RowSelectionState>({ '1': true, '2': false } as unknown as RowSelectionState)
		const table = constructWithExternalAtoms(
			DELETING_SEL,
			{ rowSelection: external },
			{ deleting: { onDelete, bulk: true } },
		)

		table.deleting.bulk.request()
		await Promise.resolve()

		// `bulk: true` carries no single-call handler, so the per-row one runs once per selected
		// row — which makes the count itself the assertion: two, and row 2 was never selected.
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(onDelete.mock.calls[0]?.[0]).toMatchObject({ rowId: '1' })
	})

	it('a bulk delete on a table with no rowSelectionFeature does not throw', async () => {
		// The other half of the foreign-write contract: `rowSelectionFeature` is legitimately
		// optional, so the write must no-op rather than crash. `writeOwnSlice` would throw here.
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: vi.fn(), bulk: true },
		})

		await expect(table.deleting.bulk.delete(['1'])).resolves.toBeUndefined()
	})
})

describe('deletingFeature', () => {
	it('deleting.delete calls onDelete with the correct row', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		await table.deleting.delete(rowId)
		expect(onDelete).toHaveBeenCalledTimes(1)
		const ctx = onDelete.mock.calls[0]?.[0] as { rowId: string; row: { original: Row }; signal: AbortSignal }
		expect(ctx.rowId).toBe(rowId)
		expect(ctx.row.original.name).toBe('Alice')
		expect(ctx.signal).toBeInstanceOf(AbortSignal)
	})

	it('deleting.delete does nothing when deleting config is absent', async () => {
		const table = createTable({ features: DELETING, data: DATA, columns: COLUMNS })
		await expect(table.deleting.delete('0')).resolves.toBeUndefined()
	})

	it('deleting.delete does nothing for unknown rowId', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete },
		})
		await table.deleting.delete('non-existent')
		expect(onDelete).not.toHaveBeenCalled()
	})
})

describe('deletingFeature — confirmation flow', () => {
	it('initializes deleting.pendingRowId to null', () => {
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: vi.fn() },
		})
		expect(deletingOf(table).pendingRowId).toBeNull()
	})

	it('deleting.request with confirmation stages the row without deleting', () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: true },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.deleting.request(rowId)
		expect(deletingOf(table).pendingRowId).toBe(rowId)
		expect(onDelete).not.toHaveBeenCalled()
	})

	it('deleting.request with confirmation object also stages the row', () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: { title: 'Delete?' } },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.deleting.request(rowId)
		expect(deletingOf(table).pendingRowId).toBe(rowId)
		expect(onDelete).not.toHaveBeenCalled()
	})

	it('deleting.request without confirmation deletes immediately', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.deleting.request(rowId)
		await Promise.resolve()
		expect(deletingOf(table).pendingRowId).toBeNull()
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect((onDelete.mock.calls[0]?.[0] as { rowId: string }).rowId).toBe(rowId)
	})

	it('deleting.request does nothing when deleting config is absent', () => {
		const table = createTable({ features: DELETING, data: DATA, columns: COLUMNS })
		expect(() => {
			table.deleting.request('0')
		}).not.toThrow()
		expect(deletingOf(table).pendingRowId).toBeNull()
	})

	it('deleting.confirm deletes the staged row and clears pending state', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: true },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.deleting.request(rowId)
		await table.deleting.confirm()
		expect(onDelete).toHaveBeenCalledTimes(1)
		expect((onDelete.mock.calls[0]?.[0] as { rowId: string }).rowId).toBe(rowId)
		expect(deletingOf(table).pendingRowId).toBeNull()
	})

	it('deleting.confirm is a no-op when nothing is staged', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: true },
		})
		await table.deleting.confirm()
		expect(onDelete).not.toHaveBeenCalled()
		expect(deletingOf(table).pendingRowId).toBeNull()
	})

	it('deleting.cancel clears pending state without deleting', () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete, confirmation: true },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.deleting.request(rowId)
		table.deleting.cancel()
		expect(deletingOf(table).pendingRowId).toBeNull()
		expect(onDelete).not.toHaveBeenCalled()
	})

	it('deleting.getState() reads the slice, like editing.getState() / creating.getState()', () => {
		const table = createTable({
			features: DELETING_SEL,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), confirmation: true, bulk: { confirmation: true } },
		})
		expect(table.deleting.getState()).toEqual({ pendingRowId: null, pendingBulk: false })

		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		table.deleting.request(rowId)
		expect(table.deleting.getState()).toEqual({ pendingRowId: rowId, pendingBulk: false })

		// Staging a bulk delete leaves the per-row half alone — one slice, two independent fields.
		table.setRowSelection({ '1': true })
		table.deleting.bulk.request()
		expect(table.deleting.getState()).toEqual({ pendingRowId: rowId, pendingBulk: true })
	})

	it('initializes deleting.pendingBulk to false', () => {
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete: vi.fn() },
		})
		expect(deletingOf(table).pendingBulk).toBe(false)
	})

	it('deleting.bulk.request stages a bulk delete when bulk.confirmation is set', () => {
		const table = createTable({
			features: DELETING_SEL,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), bulk: { confirmation: true } },
		})
		table.setRowSelection({ '1': true })
		table.deleting.bulk.request()
		expect(deletingOf(table).pendingBulk).toBe(true)
	})

	it('deleting.bulk.request deletes outright when bulk asks for no confirmation', async () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING_SEL,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete, bulk: true },
		})
		table.setRowSelection({ '1': true, '2': true })
		table.deleting.bulk.request()
		await vi.waitFor(() => {
			expect(onDelete).toHaveBeenCalledTimes(2)
		})
		expect(deletingOf(table).pendingBulk).toBe(false)
	})

	it('deleting.bulk.request does nothing when bulk is off', () => {
		const onDelete = vi.fn()
		const table = createTable({
			features: DELETING_SEL,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete },
		})
		table.setRowSelection({ '1': true })
		table.deleting.bulk.request()
		expect(deletingOf(table).pendingBulk).toBe(false)
		expect(onDelete).not.toHaveBeenCalled()
	})

	it('deleting.bulk.confirm runs the bulk handler and clears the staged flag', async () => {
		const bulkDelete = vi.fn()
		const table = createTable({
			features: DELETING_SEL,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), bulk: { onDelete: bulkDelete, confirmation: true } },
		})
		table.setRowSelection({ '1': true })
		table.deleting.bulk.request()
		await table.deleting.bulk.confirm()
		expect(bulkDelete).toHaveBeenCalledOnce()
		expect(deletingOf(table).pendingBulk).toBe(false)
	})

	it('deselects the deleted rows once the bulk handler resolves', async () => {
		const table = createTable({
			features: DELETING_SEL,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), bulk: { onDelete: vi.fn() } },
		})
		table.setRowSelection({ '1': true, '2': true })
		await table.deleting.bulk.delete(['1'])
		expect(table.atoms.rowSelection.get()).toEqual({ '2': true })
	})

	it('deleting.bulk.cancel clears the staged bulk delete without running the handler', () => {
		const bulkDelete = vi.fn()
		const table = createTable({
			features: DELETING_SEL,
			data: DATA,
			columns: COLUMNS,
			selection: true,
			deleting: { onDelete: vi.fn(), bulk: { onDelete: bulkDelete, confirmation: true } },
		})
		table.setRowSelection({ '1': true })
		table.deleting.bulk.request()
		table.deleting.bulk.cancel()
		expect(deletingOf(table).pendingBulk).toBe(false)
		expect(bulkDelete).not.toHaveBeenCalled()
	})

	it('deleting.cancel aborts the in-flight delete signal', () => {
		let captured: AbortSignal | undefined
		const onDelete = vi.fn((ctx: { signal: AbortSignal }) => {
			captured = ctx.signal
			return new Promise<void>(() => {
				/* never resolves — simulates a slow delete */
			})
		})
		const table = createTable({
			features: DELETING,
			data: DATA,
			columns: COLUMNS,
			deleting: { onDelete },
		})
		const rowId = table.getRowModel().rows[0]?.id ?? '0'
		void table.deleting.delete(rowId)
		expect(captured?.aborted).toBe(false)
		table.deleting.cancel()
		expect(captured?.aborted).toBe(true)
	})
})
