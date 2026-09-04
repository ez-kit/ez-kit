'use client'

import { createColumns, useDataGridState, useDataGridTable } from '@ez-kit/data-grid-react'
import { ArrowDown, ArrowRight, ArrowUp, CircleCheck, CircleDashed, CircleHelp, Timer } from 'lucide-react'
import { useMemo } from 'react'

import { DataGrid } from 'shared/DataGrid'

type Task = {
	id: string
	title: string
	label: 'bug' | 'feature' | 'documentation' | 'enhancement'
	status: 'todo' | 'in-progress' | 'done' | 'canceled'
	priority: 'low' | 'medium' | 'high'
	estHours: number
	createdAt: string
}

const TITLES: readonly [string, ...string[]] = [
	'The SSL feed is down, navigate the cross-platform circuit so we can override the system',
	"Quantifying the transmitter won't do anything, we need to parse the online SMTP protocol",
	'Use the back-end CSS panel, then you can hack the virtual driver!',
	'If we transmit the program, we can get to the ASCII card through the cross-platform matrix',
	'Use the multi-byte SMS protocol, then you can compress the virtual application',
	"You can't input the matrix without navigating the solid state SMTP hard drive",
	'The SCSI alarm is down, input the solid state bus so we can index the JSON pixel',
	"You can't reboot the driver without compressing the wireless COM driver!",
	'The CLI array is down, input the virtual protocol so we can back up the DRAM bus',
	'Try to quantify the DRAM program, maybe it will calculate the open-source firewall',
]

const LABELS: readonly [Task['label'], ...Task['label'][]] = ['bug', 'documentation', 'feature', 'enhancement']
const STATUSES: readonly [Task['status'], ...Task['status'][]] = ['todo', 'in-progress', 'done', 'canceled']
const PRIORITIES: readonly [Task['priority'], ...Task['priority'][]] = ['low', 'medium', 'high']

/** Non-empty by type, so the wrap-around below needs neither `!` nor a cast. */
function cycle<T>(list: readonly [T, ...T[]], index: number): T {
	return list[index % list.length] ?? list[0]
}

/** Deterministic, so the rendered table and its source panel never disagree. */
function makeTasks(count: number): Task[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `TASK-${String(1000 + i * 137).padStart(4, '0')}`,
		title: cycle(TITLES, i),
		label: cycle(LABELS, i),
		status: cycle(STATUSES, i * 3),
		priority: cycle(PRIORITIES, i * 5),
		estHours: 1 + ((i * 7) % 24),
		createdAt: new Date(2026, 8, 3 - (i % 28)).toISOString(),
	}))
}

const ICON_SIZE = 14

const STATUS_ITEMS = [
	{ value: 'todo', label: 'Todo', variant: 'outline' as const, icon: <CircleHelp size={ICON_SIZE} /> },
	{ value: 'in-progress', label: 'In-Progress', variant: 'outline' as const, icon: <Timer size={ICON_SIZE} /> },
	{ value: 'done', label: 'Done', variant: 'outline' as const, icon: <CircleCheck size={ICON_SIZE} /> },
	{ value: 'canceled', label: 'Canceled', variant: 'outline' as const, icon: <CircleDashed size={ICON_SIZE} /> },
]

const PRIORITY_ITEMS = [
	{ value: 'low', label: 'Low', icon: <ArrowDown size={ICON_SIZE} /> },
	{ value: 'medium', label: 'Medium', icon: <ArrowRight size={ICON_SIZE} /> },
	{ value: 'high', label: 'High', icon: <ArrowUp size={ICON_SIZE} /> },
]

const LABEL_STYLE = {
	display: 'inline-flex',
	alignItems: 'center',
	borderRadius: '0.375rem',
	border: '1px solid currentColor',
	opacity: 0.9,
	padding: '0 0.375rem',
	fontSize: '0.75rem',
	lineHeight: '1.25rem',
	flexShrink: 0,
} as const

// `width: 100%` because the cell is a grid item that packs to its content: without it the row
// shrink-wraps the label chip and the zero-basis text span below collapses to nothing.
const TITLE_CELL_STYLE = {
	display: 'flex',
	alignItems: 'center',
	gap: '0.5rem',
	width: '100%',
	minWidth: 0,
} as const

// `width: 0` plus `flex: 1` is what keeps the ellipsis honest: a `nowrap` span otherwise
// contributes its full text to the column's max-content width, and the kit that floors the
// table at `max-content` then stretches every column to fit the longest title.
const TITLE_TEXT_STYLE = {
	flex: '1 1 0',
	width: 0,
	overflow: 'hidden',
	textOverflow: 'ellipsis',
	whiteSpace: 'nowrap',
} as const

const FOOTER_END_STYLE = {
	display: 'flex',
	alignItems: 'center',
	gap: '1rem',
	flexWrap: 'wrap' as const,
}

const COUNT_STYLE = {
	fontSize: '0.875rem',
	opacity: 0.6,
}

const columns = createColumns<Task>([
	{ accessorKey: 'id', header: 'Task', width: 110, filtering: false },
	{
		accessorKey: 'title',
		header: 'Title',
		width: 360,
		// The one cell no config can express: a label chip beside truncated text. Everything
		// else on this table is an option, which is the point of the example.
		filtering: false,
		cell: {
			component: ({ row }) => (
				<div style={TITLE_CELL_STYLE}>
					<span style={LABEL_STYLE}>{row.label}</span>
					<span style={TITLE_TEXT_STYLE}>{row.title}</span>
				</div>
			),
		},
	},
	{
		accessorKey: 'status',
		header: 'Status',
		width: 150,
		cell: { type: 'badge', config: { items: STATUS_ITEMS } },
		filtering: { operators: { items: ['in'] } },
	},
	{
		accessorKey: 'priority',
		header: 'Priority',
		width: 140,
		cell: { type: 'select', config: { items: PRIORITY_ITEMS } },
		filtering: { operators: { items: ['in'] } },
	},
	{
		accessorKey: 'estHours',
		header: 'Est. Hours',
		width: 120,
		align: 'end',
		cell: { type: 'number' },
		filtering: { operators: { items: ['between'] } },
	},
	{
		accessorKey: 'createdAt',
		header: 'Created At',
		width: 180,
		cell: { type: 'date', config: { format: { dateStyle: 'long' } } },
		filtering: { operators: { items: ['between'] } },
	},
])

/**
 * "N of M row(s) selected" — the one footer piece with no option behind it. Both hooks are
 * public, so it is five lines rather than a feature.
 */
function SelectionCount() {
	const table = useDataGridTable()
	useDataGridState((s) => s.rowSelection)
	const selected = table.getSelectedRowModel().rows.length
	const total = table.getRowModel().rows.length
	return (
		<span style={COUNT_STYLE}>
			{selected} of {total} row(s) selected.
		</span>
	)
}

export function ExampleTaskBoardExample() {
	const data = useMemo(() => makeTasks(160), [])
	return (
		<DataGrid
			data={data}
			columns={columns}
			selection
			sorting={{ toolbar: true }}
			visibility
			globalFiltering={{ placeholder: 'Search titles…' }}
			filtering={{ variant: 'panel', panel: 'toolbar', faceted: true }}
			rowActions={{ variant: 'menu' }}
			editing={{
				mode: 'modal',
				onSave: () => {
					// Demo grid: the edit modal closes, the row is not persisted anywhere.
				},
			}}
			deleting
			pagination={{ pageSize: 10, variant: 'compact', items: [10, 20, 30, 50], pageSizer: false }}
		>
			<DataGrid.Toolbar />
			<DataGrid.Table />
			{/* The kits style `pagination-row` for exactly this: a page-control row that also
			    carries something else. Reusing it keeps the footer on one line without
			    re-deriving the pagination bar's own layout. */}
			<div data-slot='pagination-row'>
				<SelectionCount />
				<div style={FOOTER_END_STYLE}>
					<DataGrid.PageSizer />
					<DataGrid.Pagination />
				</div>
			</div>
		</DataGrid>
	)
}
