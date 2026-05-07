import {
	Pagination as ShadcnPagination,
	PaginationContent,
	PaginationLink,
	PaginationItem,
	PaginationPrevious,
	PaginationNext,
} from '@grid-shadcn/components/ui/pagination'

import type { PaginationProps } from '@ez-kit/data-grid-react'

export function Pagination({ pageIndex, pageCount, onPreviousPage, onNextPage, onPageChange }: PaginationProps) {
	return (
		<ShadcnPagination className='mt-3'>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious onClick={onPreviousPage} />
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
					<PaginationNext onClick={onNextPage} />
				</PaginationItem>
			</PaginationContent>
		</ShadcnPagination>
	)
}
