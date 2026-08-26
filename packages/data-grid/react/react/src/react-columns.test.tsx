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
			{ accessorKey: 'name', cell: { component: ({ value }) => <b>{String(value)}</b> } },
			{
				accessorKey: 'id',
				// @ts-expect-error a plain object is not a ReactNode
				cell: { component: () => ({ nope: true }) },
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
