'use client'

import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { columns, makeUsers } from '../_data'

import type { User } from '../_data'

const ROW_COUNT = 12
const PAGE_SIZE = 6

const rowWord = (count: number) => (count === 1 ? 'row' : 'rows')

/** A one-line report under the grid, so an example's effect is visible without a console. */
function Note({ children }: { children: string }) {
	return (
		<p
			style={{
				marginTop: '1rem',
				fontSize: 13,
				color: '#475569',
			}}
		>
			{children}
		</p>
	)
}

/**
 * Bulk delete: the bar's Delete button is the `deleting` feature applied to the selection, so
 * the handler lives next to the per-row one rather than under `selection`.
 */
export function SelectionDeleteExample() {
	const [data, setData] = useState<User[]>(() => makeUsers(ROW_COUNT))

	return (
		<div>
			<DataGrid
				data={data}
				columns={columns}
				selection
				pagination={{ pageSize: PAGE_SIZE }}
				deleting={{
					onDelete: ({ row }) => {
						setData((prev) => prev.filter((user) => user.id !== row.original.id))
					},
					bulk: {
						onDelete: ({ rowIds }) => {
							const removed = new Set(rowIds)
							setData((prev) => prev.filter((user) => !removed.has(String(user.id))))
						},
						confirmation: {
							title: 'Delete users?',
							description: (rows) => `${String(rows.length)} users will be permanently removed.`,
						},
					},
				}}
			/>
			<Note>{`${String(data.length)} of ${String(ROW_COUNT)} users left — reload the page to start over.`}</Note>
		</div>
	)
}

/**
 * Clearing the selection. The bar's × clears it itself; `selection.bar.onClear` only reports
 * that it happened, so anything the app keeps beside the selection can be reset in the same
 * gesture. Its `selectedRows` is the pre-reset set — `selection.onChange` fires after, with
 * nothing left to count.
 */
export function SelectionClearExample() {
	const data = useMemo(() => makeUsers(ROW_COUNT), [])
	const [note, setNote] = useState('Nothing cleared yet.')

	return (
		<div>
			<DataGrid
				data={data}
				columns={columns}
				pagination={{ pageSize: PAGE_SIZE }}
				selection={{
					onChange: (_rowSelection, rowIds) => {
						if (rowIds.length > 0) setNote(`${String(rowIds.length)} ${rowWord(rowIds.length)} selected.`)
					},
					bar: {
						onClear: ({ selectedRows }) => {
							setNote(`Cleared ${String(selectedRows.length)} ${rowWord(selectedRows.length)}.`)
						},
					},
				}}
			/>
			<Note>{note}</Note>
		</div>
	)
}

/**
 * The two halves of `selection.bar.actions`, side by side.
 *
 * **Export** is described as data — `label`, `icon`, `onAction` — and the kit draws it with the
 * chrome its own Delete button has, so it matches whichever kit renders it.
 *
 * **Assign to…** hands its markup over instead: `{ id, component }` stands where that entry's
 * button would have been, and the kit contributes nothing around it. Reach for the described form
 * first; this one is for what that shape cannot express — here, a control that is not a button.
 */
export function SelectionCustomActionExample() {
	const data = useMemo(() => makeUsers(ROW_COUNT), [])
	const [note, setNote] = useState('Select rows, then press Export or pick an assignee.')
	// Controlled, so the picker goes back to its placeholder once the selection it acted on is
	// gone — an uncontrolled one keeps showing the last name against an empty bar.
	const [assignee, setAssignee] = useState('')

	return (
		<div>
			<DataGrid
				data={data}
				columns={columns}
				pagination={{ pageSize: PAGE_SIZE }}
				selection={{
					bar: {
						actions: ({ selectedRows, clearSelection }) => [
							{
								id: 'export',
								label: 'Export',
								// The built-in icon names cover grid affordances; an action they have no
								// honest name for brings its own element.
								icon: <Download size={16} />,
								onAction: () => {
									setNote(`Exported: ${selectedRows.map((row) => row.original.name).join(', ')}`)
									clearSelection()
								},
							},
							{
								id: 'assign',
								component: (
									<select
										aria-label='Assign selected rows to'
										value={assignee}
										style={{ borderRadius: 6, border: '1px solid #cbd5e1', padding: '4px 8px', fontSize: 13 }}
										onChange={(event) => {
											setNote(
												`Assigned ${String(selectedRows.length)} ${rowWord(selectedRows.length)} to ${event.target.value}.`,
											)
											setAssignee('')
											clearSelection()
										}}
									>
										<option
											value=''
											disabled
										>
											Assign to…
										</option>
										<option value='Alice'>Alice</option>
										<option value='Bob'>Bob</option>
									</select>
								),
							},
						],
					},
				}}
			/>
			<Note>{note}</Note>
		</div>
	)
}
