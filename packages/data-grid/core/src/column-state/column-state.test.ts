import { describe, expect, it } from 'vitest'

import { buildColumnInvariants, enforceColumnInvariants, mergePinningSeed, stripColumnInvariants } from './column-state'

import type { ColumnInvariants } from './column-state'
import type { MappedColumnDef } from '../column/types'
import type { ColumnPinningState, TableFeatures, TableState } from '@tanstack/table-core'

type Row = { id: number; name: string }

const INVARIANTS: ColumnInvariants = {
	forcedStart: ['__selection__'],
	forcedEnd: ['__actions__'],
	alwaysVisible: ['__selection__', '__actions__'],
}

describe('buildColumnInvariants', () => {
	it('collects system columns as always-visible and honours their static pins', () => {
		const columns: MappedColumnDef<Row>[] = [
			{ id: '__selection__', meta: { isSystemColumn: true, pinning: { side: 'start' } } },
			{ id: 'name' },
			{ id: '__actions__', meta: { isSystemColumn: true, pinning: { side: 'end' } } },
		]

		expect(buildColumnInvariants(columns)).toEqual({
			forcedStart: ['__selection__'],
			forcedEnd: ['__actions__'],
			alwaysVisible: ['__selection__', '__actions__'],
		})
	})

	it('treats a static pin as forced but a initialSide as free', () => {
		const columns: MappedColumnDef<Row>[] = [
			{ id: 'name', meta: { pinning: { side: 'start' } } },
			{ id: 'age', meta: { pinning: { initialSide: 'start' } } },
		]

		const invariants = buildColumnInvariants(columns)
		expect(invariants.forcedStart).toEqual(['name'])
		expect(invariants.forcedEnd).toEqual([])
	})

	it('treats a non-hideable column (visibility: false) as always visible', () => {
		const columns: MappedColumnDef<Row>[] = [{ id: 'name', meta: { visibility: false } }]
		expect(buildColumnInvariants(columns).alwaysVisible).toEqual(['name'])
	})
})

describe('mergePinningSeed', () => {
	it('returns the seed unchanged when the consumer passes nothing', () => {
		expect(mergePinningSeed({ start: ['a'], end: ['b'] }, undefined)).toEqual({ start: ['a'], end: ['b'] })
	})

	it('keeps a seeded pin the consumer never mentions', () => {
		const merged = mergePinningSeed({ start: ['seeded'], end: [] }, { start: ['other'], end: [] })
		expect(merged.start).toEqual(['seeded', 'other'])
	})

	it('lets the consumer win for a column mentioned on the other side', () => {
		const merged = mergePinningSeed({ start: ['moved'], end: [] }, { start: [], end: ['moved'] })
		expect(merged.start).toEqual([])
		expect(merged.end).toEqual(['moved'])
	})

	it('does not duplicate a seeded column the consumer pins on the same side', () => {
		const merged = mergePinningSeed({ start: ['seeded'], end: [] }, { start: ['seeded'], end: [] })
		expect(merged.start).toEqual(['seeded'])
	})
})

describe('enforceColumnInvariants', () => {
	it('restores forced pins dropped by the incoming state', () => {
		const next = enforceColumnInvariants({ columnPinning: { start: ['name'], end: [] } }, INVARIANTS)
		expect(next.columnPinning).toEqual({ start: ['__selection__', 'name'], end: ['__actions__'] })
	})

	it('moves a forced column back to its own side', () => {
		const next = enforceColumnInvariants({ columnPinning: { start: ['__actions__'], end: [] } }, INVARIANTS)
		expect(next.columnPinning).toEqual({ start: ['__selection__'], end: ['__actions__'] })
	})

	it('forces an always-visible column back to visible', () => {
		const next = enforceColumnInvariants({ columnVisibility: { __actions__: false, name: false } }, INVARIANTS)
		expect(next.columnVisibility).toEqual({ __actions__: true, name: false })
	})

	it('returns the same reference when the state already satisfies the invariants', () => {
		const state = {
			columnPinning: { start: ['__selection__'], end: ['__actions__'] },
			columnVisibility: { name: false },
		} as Partial<TableState<TableFeatures>>

		const next = enforceColumnInvariants(state, INVARIANTS)
		expect(next).toBe(state)
		expect(next.columnPinning).toBe(state.columnPinning)
		expect(next.columnVisibility).toBe(state.columnVisibility)
	})

	it('leaves untouched slices referentially identical when only one slice is corrected', () => {
		const state = {
			columnPinning: { start: ['__selection__'], end: ['__actions__'] },
			columnVisibility: { __actions__: false },
		} as Partial<TableState<TableFeatures>>

		const next = enforceColumnInvariants(state, INVARIANTS)
		expect(next).not.toBe(state)
		expect(next.columnPinning).toBe(state.columnPinning)
		expect(next.columnVisibility).not.toBe(state.columnVisibility)
	})

	it('does not invent a columnPinning slice for a partial that has none', () => {
		const partial: Partial<TableState<TableFeatures>> = { columnVisibility: { __actions__: false } }
		expect(enforceColumnInvariants(partial, INVARIANTS).columnPinning).toBeUndefined()
	})

	it('puts forced start columns missing from a column order back at its start', () => {
		const next = enforceColumnInvariants({ columnOrder: ['age', 'name'] }, INVARIANTS)
		expect(next.columnOrder).toEqual(['__selection__', 'age', 'name'])
	})

	it('restores several missing forced columns in their declared order', () => {
		const invariants: ColumnInvariants = { ...INVARIANTS, forcedStart: ['__drag__', '__selection__'] }
		const next = enforceColumnInvariants({ columnOrder: ['name'] }, invariants)
		expect(next.columnOrder).toEqual(['__drag__', '__selection__', 'name'])
	})

	it('moves a forced column a column order holds away from its edge back to it', () => {
		const next = enforceColumnInvariants({ columnOrder: ['name', '__selection__'] }, INVARIANTS)
		expect(next.columnOrder).toEqual(['__selection__', 'name'])
	})

	it('leaves forced end columns out of a column order, so they follow every column it omits', () => {
		const next = enforceColumnInvariants({ columnOrder: ['__selection__', 'name', '__actions__', 'age'] }, INVARIANTS)
		expect(next.columnOrder).toEqual(['__selection__', 'name', 'age'])
	})

	it('keeps a forced end column outermost when a column is pinned after it', () => {
		const next = enforceColumnInvariants(
			{ columnPinning: { start: ['__selection__'], end: ['__actions__', 'age'] } },
			INVARIANTS,
		)
		expect(next.columnPinning).toEqual({ start: ['__selection__'], end: ['age', '__actions__'] })
	})

	it('keeps a forced start column outermost when a column is pinned before it', () => {
		const next = enforceColumnInvariants(
			{ columnPinning: { start: ['name', '__selection__'], end: ['__actions__'] } },
			INVARIANTS,
		)
		expect(next.columnPinning).toEqual({ start: ['__selection__', 'name'], end: ['__actions__'] })
	})

	it('puts several forced columns on one side back in their declared order', () => {
		const invariants: ColumnInvariants = { ...INVARIANTS, forcedStart: ['__drag__', '__selection__'] }
		const next = enforceColumnInvariants(
			{ columnPinning: { start: ['__selection__', '__drag__'], end: ['__actions__'] } },
			invariants,
		)
		expect(next.columnPinning.start).toEqual(['__drag__', '__selection__'])
	})

	it('returns a column order already in that shape by reference', () => {
		const state = { columnOrder: ['__selection__', 'name'] } as Partial<TableState<TableFeatures>>
		const next = enforceColumnInvariants(state, INVARIANTS)
		expect(next).toBe(state)
		expect(next.columnOrder).toBe(state.columnOrder)
	})

	it('leaves an empty column order empty, since it means the declared order', () => {
		const state = { columnOrder: [] } as Partial<TableState<TableFeatures>>
		expect(enforceColumnInvariants(state, INVARIANTS)).toBe(state)
	})

	it('does not invent a columnOrder slice for a partial that has none', () => {
		const partial: Partial<TableState<TableFeatures>> = {
			columnPinning: { start: ['__selection__'], end: ['__actions__'] },
		}
		expect(enforceColumnInvariants(partial, INVARIANTS).columnOrder).toBeUndefined()
	})
})

describe('stripColumnInvariants', () => {
	it('drops forced ids from both pinning sides and keeps the rest in order', () => {
		const next = stripColumnInvariants(
			{ columnPinning: { start: ['__selection__', 'name'], end: ['age', '__actions__'] } },
			INVARIANTS,
		)
		expect(next.columnPinning).toEqual({ start: ['name'], end: ['age'] })
	})

	it('drops forced ids from a column order', () => {
		const next = stripColumnInvariants({ columnOrder: ['__selection__', 'age', 'name', '__actions__'] }, INVARIANTS)
		expect(next.columnOrder).toEqual(['age', 'name'])
	})

	it('drops always-visible columns from a visibility map, whatever their value', () => {
		const next = stripColumnInvariants({ columnVisibility: { __actions__: true, name: false } }, INVARIANTS)
		expect(next.columnVisibility).toEqual({ name: false })
	})

	it('keeps a system column that is not forced', () => {
		const invariants: ColumnInvariants = { forcedStart: [], forcedEnd: ['__actions__'], alwaysVisible: [] }
		const next = stripColumnInvariants(
			{ columnPinning: { start: ['__selection__'], end: ['__actions__'] } },
			invariants,
		)
		expect(next.columnPinning).toEqual({ start: ['__selection__'], end: [] })
	})

	it('returns the same reference when there is nothing to drop', () => {
		const state = {
			columnPinning: { start: ['name'], end: [] },
			columnOrder: ['name', 'age'],
			columnVisibility: { name: false },
		} as Partial<TableState<TableFeatures>>
		expect(stripColumnInvariants(state, INVARIANTS)).toBe(state)
	})

	it('leaves untouched slices referentially identical when only one slice is stripped', () => {
		const state = {
			columnPinning: { start: ['__selection__'], end: [] },
			columnOrder: ['name'],
			columnVisibility: { name: false },
		} as Partial<TableState<TableFeatures>>
		const next = stripColumnInvariants(state, INVARIANTS)
		expect(next.columnPinning).toEqual({ start: [], end: [] })
		expect(next.columnOrder).toBe(state.columnOrder)
		expect(next.columnVisibility).toBe(state.columnVisibility)
	})

	it('does not invent slices the state does not carry', () => {
		const next = stripColumnInvariants({ sorting: [] }, INVARIANTS)
		expect(next).not.toHaveProperty('columnPinning')
		expect(next).not.toHaveProperty('columnOrder')
		expect(next).not.toHaveProperty('columnVisibility')
	})

	it('undoes what enforceColumnInvariants restores', () => {
		const user = {
			columnPinning: { start: ['name'], end: [] },
			columnOrder: ['age', 'name'],
			columnVisibility: { email: false },
		} as Partial<TableState<TableFeatures>>
		const roundTrip = stripColumnInvariants(
			enforceColumnInvariants(
				{ ...user, columnVisibility: { ...user.columnVisibility, __actions__: false } },
				INVARIANTS,
			),
			INVARIANTS,
		)
		expect(roundTrip).toEqual(user)
	})

	it('completes a hand-written pinning that carries one array, as enforce does', () => {
		const pinning = { start: ['__selection__', 'name'] } as unknown as ColumnPinningState
		expect(stripColumnInvariants({ columnPinning: pinning }, INVARIANTS).columnPinning).toEqual({
			start: ['name'],
			end: [],
		})
	})

	it('reads only own keys of a visibility map', () => {
		const invariants: ColumnInvariants = { forcedStart: [], forcedEnd: [], alwaysVisible: ['toString'] }
		const state = { columnVisibility: { name: false } } as Partial<TableState<TableFeatures>>
		expect(stripColumnInvariants(state, invariants)).toBe(state)
	})
})
