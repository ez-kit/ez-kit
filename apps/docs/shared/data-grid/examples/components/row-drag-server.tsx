'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	deletingFeature,
	filterFns,
	globalFilteringFeature,
	loadingFeature,
	rowOrderingFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { applyRowMove, createColumns } from '@ez-kit/data-grid-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { DataGridDnd } from 'shared/DataGridDnd'

import { makeEmployees } from './_data'

import type { Employee } from './_data'
import type { ColumnFiltersState, RowMove, SortingState } from '@ez-kit/data-grid-react'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowOrderingFeature,
	rowSortingFeature,
	rowSelectionFeature,
	rowPaginationFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	deletingFeature,
	loadingFeature,
	filterFns,
	sortFns,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

const columns = createColumns<Employee>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'department', header: 'Department' },
	{ accessorKey: 'salary', header: 'Salary', align: 'end', cell: { type: 'number' } },
])

const getRowId = (row: Employee) => String(row.id)

const ROW_COUNT = 60
const PAGE_SIZE = 10
const NETWORK_DELAY_MS = 400

type Query = {
	pageIndex: number
	pageSize: number
	sorting: SortingState
	columnFilters: ColumnFiltersState
	globalFilter: string
}

type Page = { rows: Employee[]; rowCount: number }

const wait = () => new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS))

const matches = (row: Employee, id: string, value: unknown) =>
	String(row[id as keyof Employee])
		.toLowerCase()
		.includes(String(value).toLowerCase())

function createServer() {
	let rows = makeEmployees(ROW_COUNT)

	return {
		async list({ pageIndex, pageSize, sorting, columnFilters, globalFilter }: Query): Promise<Page> {
			await wait()
			const search = globalFilter.trim()
			const filtered = rows.filter(
				(row) =>
					columnFilters.every((filter) => matches(row, filter.id, filter.value)) &&
					(search === '' || Object.keys(row).some((key) => matches(row, key, search))),
			)
			const sorted = sorting.reduceRight(
				(acc, { id, desc }) =>
					[...acc].sort((a, b) => {
						const av = a[id as keyof Employee]
						const bv = b[id as keyof Employee]
						return (av < bv ? -1 : av > bv ? 1 : 0) * (desc ? -1 : 1)
					}),
				filtered,
			)
			const start = pageIndex * pageSize
			return { rows: sorted.slice(start, start + pageSize), rowCount: filtered.length }
		},
		async move(move: RowMove) {
			await wait()
			rows = applyRowMove(rows, move, getRowId)
		},
		async remove(ids: string[]) {
			await wait()
			const removed = new Set(ids)
			rows = rows.filter((row) => !removed.has(getRowId(row)))
		},
	}
}

let nextLogId = 1

export function RowDragServerExample() {
	const [server] = useState(createServer)
	const [rows, setRows] = useState<Employee[]>([])
	const [rowCount, setRowCount] = useState(0)
	const [pageIndex, setPageIndex] = useState(0)
	const [pageSize, setPageSize] = useState(PAGE_SIZE)
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = useState('')
	const [revision, setRevision] = useState(0)
	const [isPending, setIsPending] = useState(true)
	const [isFetching, setIsFetching] = useState(false)
	const [log, setLog] = useState<{ id: number; label: string }[]>([])
	const latestRequest = useRef(0)

	const request = useCallback((label: string) => {
		setLog((prev) => [...prev.slice(-4), { id: nextLogId++, label }])
	}, [])

	useEffect(() => {
		const id = ++latestRequest.current
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsFetching(true)
		void server.list({ pageIndex, pageSize, sorting, columnFilters, globalFilter }).then((page) => {
			if (id !== latestRequest.current) return
			setRows(page.rows)
			setRowCount(page.rowCount)
			setIsPending(false)
			setIsFetching(false)
		})
	}, [server, pageIndex, pageSize, sorting, columnFilters, globalFilter, revision])

	const resetToFirstPage = () => {
		setPageIndex(0)
	}

	return (
		<div className='flex flex-col gap-3'>
			<div className='rounded-md border p-3 text-sm'>
				<p className='mb-1 font-semibold'>Requests</p>
				{log.length === 0 ? (
					<p className='text-muted-foreground'>Drag a row, move it from its menu, or delete one.</p>
				) : (
					<ol className='list-decimal pl-5 font-mono text-xs'>
						{log.map((entry) => (
							<li key={entry.id}>{entry.label}</li>
						))}
					</ol>
				)}
			</div>

			<DataGridDnd
				features={features}
				data={rows}
				columns={columns}
				getRowId={getRowId}
				selection
				sorting={{
					manual: true,
					onChange: (next: SortingState) => {
						setSorting(next)
						resetToFirstPage()
					},
				}}
				filtering={{
					manual: true,
					onChange: (next: ColumnFiltersState) => {
						setColumnFilters(next)
						resetToFirstPage()
					},
				}}
				globalFiltering={{
					onChange: (next: unknown) => {
						setGlobalFilter(String(next ?? ''))
						resetToFirstPage()
					},
				}}
				pagination={{
					manual: true,
					rowCount,
					items: [5, 10, 20],
					onChange: (next: { pageIndex: number; pageSize: number }) => {
						setPageIndex(next.pageIndex)
						setPageSize(next.pageSize)
					},
				}}
				ordering={{
					row: {
						onChange: (move: RowMove) => {
							setRows((current) => applyRowMove(current, move, getRowId))
							request(`PATCH /employees/${move.rowId}/position { to: ${move.targetRowId} }`)
							void server.move(move)
						},
					},
				}}
				deleting={{
					onDelete: async ({ rowId }: { rowId: string }) => {
						request(`DELETE /employees/${rowId}`)
						await server.remove([rowId])
						setRevision((n) => n + 1)
					},
					bulk: {
						onDelete: async ({ rowIds }: { rowIds: string[] }) => {
							request(`DELETE /employees?ids=${rowIds.join(',')}`)
							await server.remove(rowIds)
							setRevision((n) => n + 1)
						},
					},
				}}
				state={{
					pagination: { pageIndex, pageSize },
					sorting,
					columnFilters,
					globalFilter,
					loading: { isPending, isFetching },
				}}
			/>
		</div>
	)
}
