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

// ── scroll-container driver ─────────────────────────────────────────────────
// Auto detection measures the scroll container, so these drive real scroll events against
// it. jsdom has no layout, so the metrics the detection reads are stubbed explicitly.
const CLIENT_HEIGHT = 400
const SCROLL_HEIGHT = 1000

function getScrollContainer(): HTMLElement {
	const el = document.querySelector("[data-slot='table-scroll']")
	if (!(el instanceof HTMLElement)) throw new Error('expected a table-scroll container')
	return el
}

/** Give the container a laid-out size so it has a meaningful bottom edge. */
function stubLayout(root: HTMLElement): void {
	vi.spyOn(root, 'clientHeight', 'get').mockReturnValue(CLIENT_HEIGHT)
	vi.spyOn(root, 'scrollHeight', 'get').mockReturnValue(SCROLL_HEIGHT)
}

/** Scroll to a given distance from the bottom edge and emit the scroll event. */
function scrollToDistanceFromBottom(distance: number): void {
	const root = getScrollContainer()
	stubLayout(root)
	act(() => {
		root.scrollTop = SCROLL_HEIGHT - CLIENT_HEIGHT - distance
		root.dispatchEvent(new Event('scroll'))
	})
}

function scrollToBottom(): void {
	scrollToDistanceFromBottom(0)
}

/** Leave the trigger zone, so the next scrollToBottom() is a fresh entry into it. */
function scrollAwayFromBottom(): void {
	scrollToDistanceFromBottom(SCROLL_HEIGHT)
}

beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe(): void {}
			unobserve(): void {}
			disconnect(): void {}
		},
	)
})

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

function InfiniteGrid(props: { config: UseDataGridConfig<User> }) {
	const table = useDataGrid<User>(props.config)
	return <DataGrid table={table} />
}

describe('infinite scroll — auto trigger', () => {
	it('fires onLoadMore({ direction: forward }) once when scrolled to the bottom', () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined)
		renderWithComponents(
			<InfiniteGrid
				config={{ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', hasNextPage: true, onLoadMore } }}
			/>,
		)

		scrollToBottom()

		expect(onLoadMore).toHaveBeenCalledTimes(1)
		expect(onLoadMore).toHaveBeenCalledWith({ direction: 'forward' })
	})

	it('does not fire while the bottom edge is still out of range', () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined)
		renderWithComponents(
			<InfiniteGrid
				config={{ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', hasNextPage: true, onLoadMore } }}
			/>,
		)

		scrollAwayFromBottom()

		expect(onLoadMore).not.toHaveBeenCalled()
	})

	it('fires once per entry into the trigger zone, not for every scroll event', () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined)
		renderWithComponents(
			<InfiniteGrid
				config={{ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', hasNextPage: true, onLoadMore } }}
			/>,
		)

		scrollToBottom()
		scrollToBottom()

		expect(onLoadMore).toHaveBeenCalledTimes(1)
	})

	it('does not refire while a fetch is in flight', () => {
		const onLoadMore = vi.fn(() => new Promise<void>(() => {})) // never settles
		renderWithComponents(
			<InfiniteGrid
				config={{ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', hasNextPage: true, onLoadMore } }}
			/>,
		)

		scrollToBottom()
		scrollAwayFromBottom()
		scrollToBottom()

		expect(onLoadMore).toHaveBeenCalledTimes(1)
	})

	it('does not fire when hasNextPage is false', () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined)
		renderWithComponents(
			<InfiniteGrid
				config={{ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite', hasNextPage: false, onLoadMore } }}
			/>,
		)

		scrollToBottom()

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

		scrollToBottom()
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
