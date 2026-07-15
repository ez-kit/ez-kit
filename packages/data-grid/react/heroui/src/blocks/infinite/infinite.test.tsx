import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DataGrid, useDataGrid } from '../../index'

import type { UseDataGridConfig } from '@ez-kit/data-grid-react'

type User = { id: number; name: string }

const USERS: User[] = [
	{ id: 1, name: 'Ada' },
	{ id: 2, name: 'Grace' },
]

const COLUMNS = [{ accessorKey: 'name', header: 'Name' }] as UseDataGridConfig<User>['columns']

function InfiniteGrid(props: { config: UseDataGridConfig<User> }) {
	const instance = useDataGrid<User>(props.config)
	return <DataGrid table={instance} />
}

function getScrollContainer(): HTMLElement {
	const el = document.querySelector("[data-slot='table-scroll']")
	if (!(el instanceof HTMLElement)) throw new Error('expected a table-scroll container')
	return el
}

/**
 * Drives the scroll container to its bottom edge. jsdom has no layout, so the metrics the
 * detection reads are stubbed explicitly.
 */
function scrollToBottom(root: HTMLElement, { scrollHeight = 1000, clientHeight = 400 } = {}): void {
	vi.spyOn(root, 'scrollHeight', 'get').mockReturnValue(scrollHeight)
	vi.spyOn(root, 'clientHeight', 'get').mockReturnValue(clientHeight)
	root.scrollTop = scrollHeight - clientHeight
	fireEvent.scroll(root)
}

/**
 * HeroUI renders `Tbody` as a React Aria collection: it only keeps its own `Row` children and
 * builds them in a pass before the real DOM exists. These cover the two ways that previously
 * broke infinite scroll here (issue #67) while the shared react-layer tests — which mock the
 * loader's surroundings — stayed green.
 */
describe('@ez-kit/data-grid-heroui — infinite scroll', () => {
	it('renders the loader row inside the collection body', () => {
		render(
			<InfiniteGrid
				config={{
					data: USERS,
					columns: COLUMNS,
					pagination: { mode: 'infinite', trigger: 'manual', hasNextPage: true, onLoadMore: vi.fn() },
				}}
			/>,
		)

		// Anything the collection does not recognise is dropped, which previously took the
		// whole loader with it — leaving no way to load page 2.
		expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
	})

	it('auto trigger loads the next page when scrolled to the bottom', async () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined)

		render(
			<InfiniteGrid
				config={{
					data: USERS,
					columns: COLUMNS,
					pagination: { mode: 'infinite', hasNextPage: true, onLoadMore },
				}}
			/>,
		)

		scrollToBottom(getScrollContainer())

		await waitFor(() => {
			expect(onLoadMore).toHaveBeenCalledWith({ direction: 'forward' })
		})
	})

	it('auto trigger does not load while still far from the bottom', () => {
		const onLoadMore = vi.fn().mockResolvedValue(undefined)

		render(
			<InfiniteGrid
				config={{
					data: USERS,
					columns: COLUMNS,
					pagination: { mode: 'infinite', hasNextPage: true, onLoadMore },
				}}
			/>,
		)

		const root = getScrollContainer()
		vi.spyOn(root, 'scrollHeight', 'get').mockReturnValue(1000)
		vi.spyOn(root, 'clientHeight', 'get').mockReturnValue(400)
		root.scrollTop = 0
		fireEvent.scroll(root)

		expect(onLoadMore).not.toHaveBeenCalled()
	})
})
