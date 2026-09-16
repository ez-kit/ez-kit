import { describe, expect, it } from 'vitest'

import { buildColumnInvariants, enforceColumnInvariants, mergePinningSeed } from './column-state'

import type { ColumnInvariants } from './column-state'
import type { MappedColumnDef } from '../column/types'
import type { TableFeatures, TableState } from '@tanstack/table-core'

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
})
