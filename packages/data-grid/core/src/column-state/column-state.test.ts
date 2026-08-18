import { describe, expect, it } from 'vitest'

import { buildColumnInvariants, enforceColumnInvariants, mergePinningSeed } from './column-state'

import type { ColumnInvariants } from './column-state'
import type { TanStackColumnDef } from '../column/types'
import type { TableState } from '@tanstack/table-core'

type Row = { id: number; name: string }

const INVARIANTS: ColumnInvariants = {
	forcedLeft: ['__selection__'],
	forcedRight: ['__actions__'],
	alwaysVisible: ['__selection__', '__actions__'],
}

describe('buildColumnInvariants', () => {
	it('collects system columns as always-visible and honours their static pins', () => {
		const columns: TanStackColumnDef<Row>[] = [
			{ id: '__selection__', meta: { isSystemColumn: true, columnPinning: { pin: 'left' } } },
			{ id: 'name' },
			{ id: '__actions__', meta: { isSystemColumn: true, columnPinning: { pin: 'right' } } },
		]

		expect(buildColumnInvariants(columns)).toEqual({
			forcedLeft: ['__selection__'],
			forcedRight: ['__actions__'],
			alwaysVisible: ['__selection__', '__actions__'],
		})
	})

	it('treats a static pin as forced but a initialPin as free', () => {
		const columns: TanStackColumnDef<Row>[] = [
			{ id: 'name', meta: { columnPinning: { pin: 'left' } } },
			{ id: 'age', meta: { columnPinning: { initialPin: 'left' } } },
		]

		const invariants = buildColumnInvariants(columns)
		expect(invariants.forcedLeft).toEqual(['name'])
		expect(invariants.forcedRight).toEqual([])
	})

	it('treats a locked column (visibility: true) as always visible', () => {
		const columns: TanStackColumnDef<Row>[] = [{ id: 'name', meta: { visibility: true } }]
		expect(buildColumnInvariants(columns).alwaysVisible).toEqual(['name'])
	})
})

describe('mergePinningSeed', () => {
	it('returns the seed unchanged when the consumer passes nothing', () => {
		expect(mergePinningSeed({ left: ['a'], right: ['b'] }, undefined)).toEqual({ left: ['a'], right: ['b'] })
	})

	it('keeps a seeded pin the consumer never mentions', () => {
		const merged = mergePinningSeed({ left: ['seeded'], right: [] }, { left: ['other'], right: [] })
		expect(merged.left).toEqual(['seeded', 'other'])
	})

	it('lets the consumer win for a column mentioned on the other side', () => {
		const merged = mergePinningSeed({ left: ['moved'], right: [] }, { left: [], right: ['moved'] })
		expect(merged.left).toEqual([])
		expect(merged.right).toEqual(['moved'])
	})

	it('does not duplicate a seeded column the consumer pins on the same side', () => {
		const merged = mergePinningSeed({ left: ['seeded'], right: [] }, { left: ['seeded'], right: [] })
		expect(merged.left).toEqual(['seeded'])
	})
})

describe('enforceColumnInvariants', () => {
	it('restores forced pins dropped by the incoming state', () => {
		const next = enforceColumnInvariants({ columnPinning: { left: ['name'], right: [] } }, INVARIANTS)
		expect(next.columnPinning).toEqual({ left: ['__selection__', 'name'], right: ['__actions__'] })
	})

	it('moves a forced column back to its own side', () => {
		const next = enforceColumnInvariants({ columnPinning: { left: ['__actions__'], right: [] } }, INVARIANTS)
		expect(next.columnPinning).toEqual({ left: ['__selection__'], right: ['__actions__'] })
	})

	it('forces an always-visible column back to visible', () => {
		const next = enforceColumnInvariants({ columnVisibility: { __actions__: false, name: false } }, INVARIANTS)
		expect(next.columnVisibility).toEqual({ __actions__: true, name: false })
	})

	it('returns the same reference when the state already satisfies the invariants', () => {
		const state = {
			columnPinning: { left: ['__selection__'], right: ['__actions__'] },
			columnVisibility: { name: false },
		} as Partial<TableState>

		const next = enforceColumnInvariants(state, INVARIANTS)
		expect(next).toBe(state)
		expect(next.columnPinning).toBe(state.columnPinning)
		expect(next.columnVisibility).toBe(state.columnVisibility)
	})

	it('leaves untouched slices referentially identical when only one slice is corrected', () => {
		const state = {
			columnPinning: { left: ['__selection__'], right: ['__actions__'] },
			columnVisibility: { __actions__: false },
		} as Partial<TableState>

		const next = enforceColumnInvariants(state, INVARIANTS)
		expect(next).not.toBe(state)
		expect(next.columnPinning).toBe(state.columnPinning)
		expect(next.columnVisibility).not.toBe(state.columnVisibility)
	})

	it('does not invent a columnPinning slice for a partial that has none', () => {
		const partial: Partial<TableState> = { columnVisibility: { __actions__: false } }
		expect(enforceColumnInvariants(partial, INVARIANTS).columnPinning).toBeUndefined()
	})
})
