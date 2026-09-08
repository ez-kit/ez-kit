'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { crudColumns } from './columns'
import { api, resetServer, setShouldFailWrites } from './fake-api'

import type { Employee } from './use-employee-store'

/** Placeholder id for the row that is on screen before the server has handed out a real one. */
let nextTempId = -1

type LogEntry = { id: number; label: string; outcome: 'applied' | 'confirmed' | 'rolled back' }

const OUTCOME_COLOR: Record<LogEntry['outcome'], string> = {
	applied: 'text-muted-foreground',
	confirmed: 'text-emerald-600 dark:text-emerald-400',
	'rolled back': 'text-red-600 dark:text-red-400',
}

let nextLogId = 1

export function CrudServerExample() {
	const [rows, setRows] = useState<Employee[]>([])
	const [isPending, setIsPending] = useState(true)
	const [isFetching, setIsFetching] = useState(false)
	const [failWrites, setFailWrites] = useState(false)
	const [log, setLog] = useState<LogEntry[]>([])

	// The snapshot a rollback restores must be the rows as they are *now*, not as they
	// were when the handler closure was created.
	const rowsRef = useRef(rows)
	rowsRef.current = rows

	const load = useCallback(async () => {
		setIsFetching(true)
		const fresh = await api.list()
		setRows(fresh)
		setIsPending(false)
		setIsFetching(false)
	}, [])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void load()
	}, [load])

	const append = useCallback((label: string, outcome: LogEntry['outcome']) => {
		setLog((prev) => [...prev, { id: nextLogId++, label, outcome }])
	}, [])

	/**
	 * The whole optimistic loop in one place: paint the change, call the server,
	 * reconcile with what came back — and put the old rows back if it threw.
	 */
	const mutate = useCallback(
		async (
			label: string,
			optimistic: (current: Employee[]) => Employee[],
			commit: () => Promise<(current: Employee[]) => Employee[]>,
		): Promise<void> => {
			const snapshot = rowsRef.current
			setRows(optimistic(snapshot))
			append(label, 'applied')
			try {
				const reconcile = await commit()
				setRows((current) => reconcile(current))
				append(label, 'confirmed')
			} catch (error) {
				setRows(snapshot)
				append(label, 'rolled back')
				// Rethrown so the grid keeps the editor open with its error state —
				// swallowing it here would tell the grid the write succeeded.
				throw error
			}
		},
		[append],
	)

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex flex-wrap items-center gap-3 text-sm'>
				<label className='flex items-center gap-2'>
					<input
						type='checkbox'
						checked={failWrites}
						onChange={(event) => {
							setFailWrites(event.target.checked)
							setShouldFailWrites(event.target.checked)
						}}
					/>
					Server rejects every write
				</label>
				<button
					type='button'
					className='rounded-md border px-2 py-1 text-xs'
					onClick={() => {
						resetServer()
						setLog([])
						void load()
					}}
				>
					Reset server
				</button>
			</div>

			<div className='rounded-md border p-3 text-sm'>
				<p className='mb-1 font-semibold'>
					Request log <span className='font-normal'>(create, edit or delete a row)</span>
				</p>
				{log.length === 0 ? (
					<p className='text-muted-foreground'>No writes yet.</p>
				) : (
					<ol className='list-decimal pl-5'>
						{log.slice(-6).map((entry) => (
							<li key={entry.id}>
								{entry.label} — <span className={OUTCOME_COLOR[entry.outcome]}>{entry.outcome}</span>
							</li>
						))}
					</ol>
				)}
			</div>

			<DataGrid
				data={rows}
				columns={crudColumns}
				sorting
				filtering={{ variant: 'popover' }}
				pagination={{ pageSize: 10, items: [5, 10, 20, 50] }}
				visibility
				pinning={{ column: true }}
				selection
				state={{ loading: { isPending, isFetching, isError: false, error: null } }}
				creating={{
					mode: 'modal',
					onSave: async ({ values, signal }) => {
						const tempId = nextTempId--
						const optimisticRow = { ...values, id: tempId } as Employee
						await mutate(
							`POST /employees — ${optimisticRow.name}`,
							(current) => [...current, optimisticRow],
							async () => {
								const created = await api.create(values, signal)
								// The server owns the id: swap the placeholder row for the real one.
								return (current) => current.map((row) => (row.id === tempId ? created : row))
							},
						)
					},
				}}
				editing={{
					mode: 'row',
					onSave: async ({ rowId, values, signal }) => {
						const id = Number(rowId)
						const patch = values
						await mutate(
							`PATCH /employees/${rowId}`,
							(current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
							async () => {
								const updated = await api.update(id, patch, signal)
								return (current) => current.map((row) => (row.id === id ? updated : row))
							},
						)
					},
				}}
				deleting={{
					onDelete: async ({ row, signal }) => {
						const id = row.original.id
						await mutate(
							`DELETE /employees/${String(id)}`,
							(current) => current.filter((item) => item.id !== id),
							async () => {
								await api.delete([id], signal)
								return (current) => current
							},
						)
					},
					confirmation: {
						title: 'Delete employee?',
						description: (row) => `"${row.original.name}" will be removed from the server.`,
					},
					bulk: {
						onDelete: async ({ rows: selected, signal }) => {
							const ids = selected.map((row) => row.original.id)
							const removed = new Set(ids)
							await mutate(
								`DELETE /employees?ids=${ids.join(',')}`,
								(current) => current.filter((item) => !removed.has(item.id)),
								async () => {
									await api.delete(ids, signal)
									return (current) => current
								},
							)
						},
						confirmation: {
							title: 'Delete employees?',
							description: (selected) => `${String(selected.length)} employees will be removed from the server.`,
						},
					},
				}}
			/>
		</div>
	)
}
