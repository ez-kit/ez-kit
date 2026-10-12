import { memo } from 'react'
import { describe, expect, it } from 'vitest'

import { createColumns } from './react-columns'

type User = { id: number; name: string }

/**
 * Core carries the renderer slots with an open `TNode`, because it is framework-agnostic and
 * never calls them. The adapter binds it to `ReactNode`, which is what turns these three from
 * "compiles as `unknown`" into real checks.
 */
describe('React-bound column definitions', () => {
	it('type-checks what a header renderer returns', () => {
		const columns = createColumns<User>([
			{ accessorKey: 'name', header: () => <span>Name</span> },
			{
				accessorKey: 'id',
				// @ts-expect-error a plain object is not a ReactNode
				header: () => ({ nope: true }),
			},
		])
		expect(columns).toHaveLength(2)
	})

	it('type-checks what a cell renderer returns', () => {
		const columns = createColumns<User>([
			{ accessorKey: 'name', cell: { component: ({ value }) => <b>{value}</b> } },
			{
				accessorKey: 'id',
				// @ts-expect-error a plain object is not a ReactNode
				cell: { component: () => ({ nope: true }) },
			},
		])
		expect(columns).toHaveLength(2)
	})

	/**
	 * The documented `aggregation: { fn, component }` form, compiled — which is the whole point of
	 * this case. Nothing compiled it before: the only example writes the scalar `aggregation:
	 * 'sum'`, so the object arm existed solely inside an MDX fence, and `docs-option-names.test.ts`
	 * resolves documented *names* against the real types, never assignability. `component` was
	 * therefore declared bare `TNode` for a while, which made the documented form a hard `TS2322`
	 * under this adapter. The `cell.component` case above is the control that localises a
	 * regression here to `aggregation` rather than to the column config at large.
	 */
	it('type-checks what an aggregated-cell renderer returns', () => {
		const columns = createColumns<User>([
			{ accessorKey: 'id', aggregation: { fn: 'sum', component: ({ value }) => <b>{value}</b> } },
			{
				accessorKey: 'id',
				// @ts-expect-error a plain object is not a ReactNode
				aggregation: { fn: 'sum', component: () => ({ nope: true }) },
			},
		])
		expect(columns).toHaveLength(2)
	})

	it('accepts a memo-wrapped renderer, which a bare function type would reject', () => {
		const Cell = memo(function Cell({ value }: { value: unknown }) {
			return <b>{String(value)}</b>
		})

		const columns = createColumns<User>([{ accessorKey: 'name', cell: { component: Cell } }])
		expect(columns).toHaveLength(1)
	})
})
