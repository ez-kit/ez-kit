import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { createColumns } from '../react-columns'
import { TEST_FEATURES, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'
import { DragAxis, DragInput, DragSurface } from './dnd'

import type { DndAdapter, DndAnnouncements, DndDropEvent, DragSpec, SortableItemHandle } from './dnd'
import type { DataGridSortMenuTriggerRenderArgs } from './sort-menu-trigger'
import type { SortingConfig, SortingState } from '@ez-kit/data-grid-core'

type Row = { a: string; b: number; c: string; notes: string }

const ROWS: Row[] = [
	{ a: 'x', b: 1, c: 'p', notes: 'n1' },
	{ a: 'y', b: 2, c: 'q', notes: 'n2' },
]

const COLUMNS = createColumns<Row>([
	{ accessorKey: 'a', header: 'Status' },
	{ accessorKey: 'b', header: 'Date' },
	{ accessorKey: 'c', header: 'Owner' },
	{ accessorKey: 'notes', header: 'Notes', sorting: { multi: false } },
] as never)

/** An adapter double holding the latest render's provider props, and every spec registered. */
function makeAdapter(draggingId?: string) {
	const specs: DragSpec[] = []
	let onDrop: ((event: DndDropEvent) => void) | undefined
	let announcements: DndAnnouncements | undefined

	const adapter: DndAdapter = {
		Provider: (props) => {
			onDrop = props.onDrop
			announcements = props.announcements
			return <>{props.children}</>
		},
		useSortableItem: (spec): SortableItemHandle => {
			specs.push(spec)
			return { ref: () => {}, handleRef: () => {}, isDragging: spec.id === draggingId }
		},
	}

	return {
		adapter,
		sortSpecs: () => {
			const byId = new Map<string, DragSpec>()
			for (const spec of specs) if (spec.axis === DragAxis.Sorting) byId.set(spec.id, spec)
			return [...byId.values()]
		},
		drop: (sourceId: string, targetId: string) => {
			act(() => {
				onDrop?.({ axis: DragAxis.Sorting, surface: DragSurface.Panel, sourceId, targetId })
			})
		},
		announcements: () => announcements,
	}
}

function renderBuilder({
	sorting,
	initial,
	adapter,
	onArgs,
}: {
	sorting: SortingConfig
	initial: SortingState
	adapter?: DndAdapter
	onArgs?: (args: DataGridSortMenuTriggerRenderArgs) => void
}) {
	const onChange = vi.fn()
	const { DataGrid: BoundDataGrid } = createDataGrid({
		components: testComponents,
		...(adapter ? { dnd: adapter } : {}),
	})

	render(
		<BoundDataGrid
			columns={COLUMNS}
			data={ROWS}
			features={TEST_FEATURES}
			initialState={{ sorting: initial }}
			sorting={{ ...sorting, onChange }}
		>
			{onArgs ? (
				<DataGrid.SortMenuTrigger>
					{(args) => {
						onArgs(args)
						return null
					}}
				</DataGrid.SortMenuTrigger>
			) : (
				<DataGrid.SortMenuTrigger />
			)}
		</BoundDataGrid>,
	)

	return { onChange }
}

const lastArgs = () => {
	let args: DataGridSortMenuTriggerRenderArgs | undefined
	return {
		onArgs: (next: DataGridSortMenuTriggerRenderArgs) => {
			args = next
		},
		read: () => {
			if (!args) throw new Error('the builder never rendered')
			return args
		},
	}
}

const addButton = () => screen.getByRole('button', { name: 'Add Sort' })

describe('adding an entry follows `sorting.multi`', () => {
	it('is unavailable with multi-sort off once an entry exists', async () => {
		const { onChange } = renderBuilder({ sorting: {}, initial: [{ id: 'a', desc: false }] })

		expect(addButton()).toBeDisabled()
		await userEvent.click(addButton())
		expect(onChange).not.toHaveBeenCalled()
	})

	it('is available with multi-sort off while the sort is empty', () => {
		renderBuilder({ sorting: {}, initial: [] })

		expect(addButton()).toBeEnabled()
	})

	it('stops at `multi.max`, and opens again once an entry is removed', () => {
		const args = lastArgs()
		renderBuilder({
			sorting: { multi: { max: 2 } },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: true },
			],
			onArgs: args.onArgs,
		})

		expect(args.read().canAddSort).toBe(false)
		act(() => {
			args.read().onAddSort()
		})
		expect(args.read().items).toHaveLength(2)

		act(() => {
			args.read().items[1]?.onRemove()
		})
		expect(args.read().canAddSort).toBe(true)
	})

	it('offers a column outside multi-sort for the first entry only', () => {
		const args = lastArgs()
		renderBuilder({
			sorting: { multi: true },
			initial: [
				{ id: 'notes', desc: false },
				{ id: 'a', desc: false },
			],
			onArgs: args.onArgs,
		})

		expect(args.read().items[0]?.availableColumns.map((c) => c.id)).toContain('notes')
		expect(args.read().items[1]?.availableColumns.map((c) => c.id)).toEqual(['a', 'b', 'c'])
	})

	it('keeps a column outside multi-sort in its own entry when the sort arrived that way', () => {
		const args = lastArgs()
		renderBuilder({
			sorting: { multi: true },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'notes', desc: false },
			],
			onArgs: args.onArgs,
		})

		expect(args.read().items[1]?.availableColumns.map((c) => c.id)).toContain('notes')
	})

	it('never appends a column outside multi-sort', () => {
		const args = lastArgs()
		renderBuilder({
			sorting: { multi: true },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: false },
				{ id: 'c', desc: false },
			],
			onArgs: args.onArgs,
		})

		expect(args.read().canAddSort).toBe(false)
	})
})

describe('a step changes an entry’s priority', () => {
	it('raises an entry and keeps both directions, in one change', async () => {
		const { onChange } = renderBuilder({
			sorting: { multi: true },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: true },
			],
		})

		await userEvent.click(screen.getByRole('button', { name: 'Move sort by Date up' }))

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith([
			{ id: 'b', desc: true },
			{ id: 'a', desc: false },
		])
	})

	it('disables the step past either end of the list', () => {
		renderBuilder({
			sorting: { multi: true },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: false },
				{ id: 'c', desc: false },
			],
		})

		expect(screen.getByRole('button', { name: 'Move sort by Status up' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Move sort by Owner down' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Move sort by Date up' })).toBeEnabled()
		expect(screen.getByRole('button', { name: 'Move sort by Date down' })).toBeEnabled()
	})

	it('offers no pair when the mode resolves without it', () => {
		const args = lastArgs()
		renderBuilder({
			sorting: { multi: { reorderable: false } },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: false },
			],
			onArgs: args.onArgs,
		})

		expect(args.read().items.every((item) => item.ordering === undefined)).toBe(true)
	})

	it('offers no pair while multi-sort is off', () => {
		const args = lastArgs()
		renderBuilder({ sorting: {}, initial: [{ id: 'a', desc: false }], onArgs: args.onArgs })

		expect(args.read().items[0]?.ordering).toBeUndefined()
	})
})

describe('a column outside multi-sort stays first', () => {
	const initial = [
		{ id: 'notes', desc: false },
		{ id: 'a', desc: false },
	]

	it('offers no step that would move it down', () => {
		renderBuilder({ sorting: { multi: true }, initial })

		expect(screen.getByRole('button', { name: 'Move sort by Notes down' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Move sort by Status up' })).toBeDisabled()
	})

	it('commits no drop that would move it down', () => {
		const { adapter, drop } = makeAdapter()
		const { onChange } = renderBuilder({ sorting: { multi: true }, initial, adapter })

		drop('notes', 'a')
		drop('a', 'notes')

		expect(onChange).not.toHaveBeenCalled()
	})
})

describe('the default mode, with and without an adapter', () => {
	const initial = [
		{ id: 'a', desc: false },
		{ id: 'b', desc: false },
	]

	it('steps without an adapter, and offers no grip', () => {
		renderBuilder({ sorting: { multi: true }, initial })

		expect(screen.getAllByRole('button', { name: /^Move sort by/ })).toHaveLength(4)
		expect(screen.queryByRole('button', { name: /^Reorder sort by/ })).toBeNull()
	})

	it('drags with an adapter, and offers no steps', () => {
		const { adapter, sortSpecs } = makeAdapter()
		renderBuilder({ sorting: { multi: true }, initial, adapter })

		expect(screen.getByRole('button', { name: 'Reorder sort by Status' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /^Move sort by/ })).toBeNull()
		expect(sortSpecs().map((spec) => [spec.id, spec.index, spec.surface])).toEqual([
			['a', 0, DragSurface.Panel],
			['b', 1, DragSurface.Panel],
		])
	})

	it("offers both under `'both'`", () => {
		const { adapter } = makeAdapter()
		renderBuilder({ sorting: { multi: { reorderable: 'both' } }, initial, adapter })

		expect(screen.getAllByRole('button', { name: /^Reorder sort by/ })).toHaveLength(2)
		expect(screen.getAllByRole('button', { name: /^Move sort by/ })).toHaveLength(4)
	})

	it("steps alone under `'step'`, with an adapter bound", () => {
		const { adapter, sortSpecs } = makeAdapter()
		renderBuilder({ sorting: { multi: { reorderable: 'step' } }, initial, adapter })

		expect(screen.queryByRole('button', { name: /^Reorder sort by/ })).toBeNull()
		expect(screen.getAllByRole('button', { name: /^Move sort by/ })).toHaveLength(4)
		expect(sortSpecs()).toHaveLength(0)
	})
})

describe('a drop changes an entry’s priority', () => {
	it('lands the source where the target stood, in one change', () => {
		const { adapter, drop } = makeAdapter()
		const { onChange } = renderBuilder({
			sorting: { multi: true },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: true },
				{ id: 'c', desc: false },
			],
			adapter,
		})

		drop('a', 'c')

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith([
			{ id: 'b', desc: true },
			{ id: 'c', desc: false },
			{ id: 'a', desc: false },
		])
	})

	it('commits nothing for a self-drop or an id the sort does not hold', () => {
		const { adapter, drop } = makeAdapter()
		const { onChange } = renderBuilder({
			sorting: { multi: true },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: false },
			],
			adapter,
		})

		drop('a', 'a')
		drop('a', 'notes')

		expect(onChange).not.toHaveBeenCalled()
	})

	it('announces the sort entry by name and priority', () => {
		const { adapter, announcements } = makeAdapter()
		renderBuilder({
			sorting: { multi: true },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: false },
				{ id: 'c', desc: false },
			],
			adapter,
		})
		const keyboard = { axis: DragAxis.Sorting, surface: DragSurface.Panel, input: DragInput.Keyboard } as const
		const bag = announcements()

		expect(bag?.dragStart({ ...keyboard, sourceId: 'a' })).toBe('Picked up sort by Status, priority 1 of 3.')
		expect(bag?.dragOver({ ...keyboard, sourceId: 'a', targetId: 'b' })).toBe(
			'Moved sort by Status to priority 2 of 3.',
		)
		expect(bag?.dragEnd({ ...keyboard, sourceId: 'a', targetId: 'b' })).toBe(
			'Dropped sort by Status at priority 2 of 3.',
		)
	})
})

describe('`<DataGrid.SortItem>`', () => {
	it('hands each entry the row slot, and no handle without an adapter', () => {
		const seen: unknown[] = []
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents })
		render(
			<BoundDataGrid
				columns={COLUMNS}
				data={ROWS}
				features={TEST_FEATURES}
				initialState={{ sorting: [{ id: 'a', desc: false }] }}
				sorting={{ multi: true }}
			>
				<DataGrid.SortItem sortId='a'>
					{(props) => {
						seen.push(props)
						return null
					}}
				</DataGrid.SortItem>
			</BoundDataGrid>,
		)

		expect(seen.at(-1)).toEqual({
			itemProps: { 'data-slot': 'sort-row', 'data-column-id': 'a' },
			handleProps: null,
			isDragging: false,
		})
	})

	it('marks only the entry being dragged', () => {
		const { adapter } = makeAdapter('b')
		renderBuilder({
			sorting: { multi: true },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: false },
			],
			adapter,
		})

		const dragging = document.querySelectorAll('[data-slot="sort-row"][data-sort-dragging]')
		expect([...dragging].map((node) => node.getAttribute('data-column-id'))).toEqual(['b'])
	})
})

describe('a grip asked for without an adapter', () => {
	let warn: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warn.mockRestore()
	})

	it('falls back to the steps and names the option once', async () => {
		renderBuilder({
			sorting: { multi: { reorderable: 'drag' } },
			initial: [
				{ id: 'a', desc: false },
				{ id: 'b', desc: false },
			],
		})

		expect(screen.getAllByRole('button', { name: /^Move sort by/ })).toHaveLength(4)
		await userEvent.click(screen.getByRole('button', { name: 'Move sort by Date up' }))

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`sorting.multi.reorderable`'))
	})
})
