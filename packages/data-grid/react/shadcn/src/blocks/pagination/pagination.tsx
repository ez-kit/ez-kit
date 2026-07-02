import {
	Pagination as ShadcnPagination,
	PaginationContent,
	PaginationLink,
	PaginationItem,
	PaginationPrevious,
	PaginationNext,
} from '@grid-shadcn/components/ui/pagination'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const DISABLED_CLASS = 'pointer-events-none opacity-50'

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
	// This is only meaningful when both rowCount and a valid pageCount are present.
	const pageSize = rowCount !== undefined && pageCount > 0 ? Math.ceil(rowCount / pageCount) : undefined
	const rangeLabel = rowCount !== undefined && pageSize !== undefined
		? buildRangeLabel(pageIndex, pageSize, rowCount)
		: undefined

	return (
		<ShadcnPagination className='mt-3'>
			{rangeLabel !== undefined && (
				<span className='mr-3 flex items-center text-sm text-muted-foreground'>
					{rangeLabel}
				</span>
			)}
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						aria-disabled={!canPreviousPage}
						className={canPreviousPage ? undefined : DISABLED_CLASS}
						onClick={canPreviousPage ? onPreviousPage : undefined}
					/>
				</PaginationItem>
				{Array.from({ length: pageCount }).map((_, index) => (
					<PaginationItem key={index}>
						<PaginationLink
							isActive={index === pageIndex}
							onClick={() => {
								onPageChange(index)
							}}
						>
							{index + 1}
						</PaginationLink>
					</PaginationItem>
				))}
				<PaginationItem>
					<PaginationNext
						aria-disabled={!canNextPage}
						className={canNextPage ? undefined : DISABLED_CLASS}
						onClick={canNextPage ? onNextPage : undefined}
					/>
				</PaginationItem>
			</PaginationContent>
		</ShadcnPagination>
	)
}
