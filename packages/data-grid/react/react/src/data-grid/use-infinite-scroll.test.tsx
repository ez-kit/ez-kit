import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { UseDataGridConfig } from '../use-data-grid'

type User = { id: number; name: string; age: number }

const USERS: User[] = [
	{ id: 1, name: 'Alice', age: 30 },
	{ id: 2, name: 'Bob', age: 25 },
]

const COLUMNS = [
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
] as UseDataGridConfig<User>['columns']

// ── IntersectionObserver mock ───────────────────────────────────────────────
type IOEntry = { isIntersecting: boolean }
let ioCallbacks: ((entries: IOEntry[]) => void)[] = []

class MockIntersectionObserver {
	constructor(cb: (entries: IOEntry[]) => void) {
		ioCallbacks.push(cb)
	}
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): IOEntry[] {
		return []
	}
}

function fireIntersect(): void {
	act(() => {
		for (const cb of ioCallbacks) cb([{ isIntersecting: true }])
	})
}

beforeEach(() => {
	ioCallbacks = []
	vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

function InfiniteGrid(props: { config: UseDataGridConfig<User> }) {
	const instance = useDataGrid<User>(props.config)
	return <DataGrid table={instance} />
}

describe('infinite scroll — auto trigger', () => {
	it('fires onLoadMore({ direction: forward }) once when the sentinel intersects', () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined)
		renderWithComponents(
			<InfiniteGrid
				config={{ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', hasNextPage: true, onLoadMore } }}
			/>,
		)

		fireIntersect()

		expect(onLoadMore).toHaveBeenCalledTimes(1)
		expect(onLoadMore).toHaveBeenCalledWith({ direction: 'forward' })
	})

	it('does not refire while a fetch is in flight', () => {
		const onLoadMore = vi.fn(() => new Promise<void>(() => {})) // never settles
		renderWithComponents(
			<InfiniteGrid
				config={{ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', hasNextPage: true, onLoadMore } }}
			/>,
		)

		fireIntersect()
		fireIntersect()

		expect(onLoadMore).toHaveBeenCalledTimes(1)
	})

	it('does not fire when hasNextPage is false', () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined)
		renderWithComponents(
			<InfiniteGrid
				config={{ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', hasNextPage: false, onLoadMore } }}
			/>,
		)

		fireIntersect()

		expect(onLoadMore).not.toHaveBeenCalled()
	})
})

describe('infinite scroll — manual trigger', () => {
	it('does not auto-load; the button calls onLoadMore', async () => {
		const user = userEvent.setup()
		const onLoadMore = vi.fn().mockResolvedValue(undefined)
		renderWithComponents(
			<InfiniteGrid
				config={{
					data: USERS,
					columns: COLUMNS,
					pagination: { mode: 'infinite', hasNextPage: true, trigger: 'manual', onLoadMore },
				}}
			/>,
		)

		fireIntersect()
		expect(onLoadMore).not.toHaveBeenCalled()

		await user.click(screen.getByText('Load more'))
		expect(onLoadMore).toHaveBeenCalledWith({ direction: 'forward' })
	})
})

describe('infinite scroll — error + retry', () => {
	it('surfaces an error then retry re-invokes and clears it', async () => {
		const user = userEvent.setup()
		const onLoadMore = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
		renderWithComponents(
			<InfiniteGrid
				config={{
					data: USERS,
					columns: COLUMNS,
					pagination: { mode: 'infinite', hasNextPage: true, trigger: 'manual', onLoadMore },
				}}
			/>,
		)

		await user.click(screen.getByText('Load more'))
		const retry = await screen.findByText('Retry')

		await user.click(retry)
		expect(onLoadMore).toHaveBeenCalledTimes(2)
		await waitFor(() => {
			expect(screen.queryByText('Retry')).not.toBeInTheDocument()
		})
	})
})

describe('infinite scroll — reset on query change', () => {
	it('clears the error when sorting changes', async () => {
		const user = userEvent.setup()
		const onLoadMore = vi.fn().mockRejectedValue(new Error('boom'))
		renderWithComponents(
			<InfiniteGrid
				config={{
					data: USERS,
					columns: COLUMNS,
					sorting: true,
					pagination: { mode: 'infinite', hasNextPage: true, trigger: 'manual', onLoadMore },
				}}
			/>,
		)

		await user.click(screen.getByText('Load more'))
		await screen.findByText('Retry')

		// Change the query — click the sortable "Name" header.
		await user.click(screen.getByText('Name'))

		await waitFor(() => {
			expect(screen.queryByText('Retry')).not.toBeInTheDocument()
		})
	})
})
