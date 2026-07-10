'use client'

import { DataGrid, useDataGrid } from 'shared/DataGrid'

type Task = {
	id: number
	title: string
	priority: 'low' | 'medium' | 'high' | 'critical'
	rank: number
	dueDate: string
	assignee: string | undefined
}

const PRIORITY_RANK: Record<Task['priority'], number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
}

const DATA: Task[] = [
	{ id: 1, title: 'Fix auth race condition', priority: 'critical', rank: 1, dueDate: '2026-05-14', assignee: 'Alice' },
	{ id: 2, title: 'Migrate analytics pipeline', priority: 'high', rank: 4, dueDate: '2026-05-22', assignee: 'Bob' },
	{ id: 3, title: 'Refresh design tokens', priority: 'medium', rank: 7, dueDate: '2026-06-02', assignee: undefined },
	{ id: 4, title: 'Backfill historical events', priority: 'high', rank: 3, dueDate: '2026-05-19', assignee: 'Carol' },
	{ id: 5, title: 'Tidy onboarding copy', priority: 'low', rank: 12, dueDate: '2026-06-12', assignee: 'David' },
	{ id: 6, title: 'Audit permissions matrix', priority: 'critical', rank: 2, dueDate: '2026-05-15', assignee: undefined },
	{ id: 7, title: 'Investigate slow query', priority: 'high', rank: 5, dueDate: '2026-05-25', assignee: 'Eve' },
	{ id: 8, title: 'Wire up push notifications', priority: 'medium', rank: 9, dueDate: '2026-06-08', assignee: 'Frank' },
]

export function SortingExample() {
	const table = useDataGrid({
		data: DATA,
		columns: [
			{ accessorKey: 'title', header: 'Title' },
			{
				accessorKey: 'priority',
				header: 'Priority',
				sorting: {
					// Custom sort function — refers to the table-level `sorting.fns` registry.
					fn: 'priorityRank',
				},
			},
			{
				accessorKey: 'rank',
				header: 'Rank',
				cell: { type: 'number' },
				// Lower rank = better, but the header still shows the natural ↑/↓ arrow.
				sorting: { invert: true },
			},
			{
				accessorKey: 'dueDate',
				header: 'Due',
				cell: { type: 'date' },
				sorting: { fn: 'datetime' },
			},
			{
				accessorKey: 'assignee',
				header: 'Assignee',
				// Push unassigned tasks to the bottom regardless of direction.
				sorting: { undefined: 'last' },
			},
		],
		// Two-column initial sort: critical first, then earliest due date.
		initialState: {
			sorting: [
				{ id: 'priority', desc: false },
				{ id: 'dueDate', desc: false },
			],
		},
		sorting: {
			// Hold ⌘/Ctrl-click to extend; cap at 3 active sort columns.
			multi: { max: 3, event: 'ctrl' },
			// Custom comparator addressable from `column.sorting.fn = 'priorityRank'`.
			fns: {
				priorityRank: (rowA, rowB, columnId) => {
					const a = (rowA as { getValue: (k: string) => Task['priority'] }).getValue(columnId)
					const b = (rowB as { getValue: (k: string) => Task['priority'] }).getValue(columnId)
					return PRIORITY_RANK[a] - PRIORITY_RANK[b]
				},
			},
			// Mirror sort state into the URL (or a server query).
			onChange: (sort) => {
				if (typeof window !== 'undefined') console.info('[sorting]', sort)
			},
			toolbar: true,
		},
	})

	return <DataGrid table={table} />
}
