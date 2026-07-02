'use client'

import { Pagination as HeroPagination } from '@heroui/react'

import type { PaginationProps } from '@ez-kit/data-grid-react'

function buildRangeLabel(pageIndex: number, pageSize: number, rowCount: number): string {
	const from = pageIndex * pageSize + 1
	const to = Math.min((pageIndex + 1) * pageSize, rowCount)
	return `${String(from)}–${String(to)} of ${String(rowCount)}`
}

export function Pagination({
	pageIndex,
	pageCount,
	rowCount,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onPageChange,
}: PaginationProps) {
	// Derive pageSize from rowCount and pageCount when available for the range label.
	const pageSize = rowCount !== undefined && pageCount > 0 ? Math.ceil(rowCount / pageCount) : undefined
	const rangeLabel = rowCount !== undefined && pageSize !== undefined
		? buildRangeLabel(pageIndex, pageSize, rowCount)
		: undefined

	return (
		<HeroPagination aria-label='Pagination'>
			{rangeLabel !== undefined && (
				<HeroPagination.Item>
					<span className='px-2 text-sm text-default-500'>{rangeLabel}</span>
				</HeroPagination.Item>
			)}
			<HeroPagination.Content>
				<HeroPagination.Item>
					<HeroPagination.Previous
						isDisabled={!canPreviousPage}
						onPress={onPreviousPage}
					>
						Previous
					</HeroPagination.Previous>
				</HeroPagination.Item>
				{Array.from({ length: pageCount }).map((_, index) => (
					<HeroPagination.Item key={index}>
						<HeroPagination.Link
							isActive={index === pageIndex}
							onPress={() => {
								onPageChange(index)
							}}
						>
							{index + 1}
						</HeroPagination.Link>
					</HeroPagination.Item>
				))}
				<HeroPagination.Item>
					<HeroPagination.Next
						isDisabled={!canNextPage}
						onPress={onNextPage}
					>
						Next
					</HeroPagination.Next>
				</HeroPagination.Item>
			</HeroPagination.Content>
		</HeroPagination>
	)
}
