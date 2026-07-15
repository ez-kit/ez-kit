import { buildPaginationLabel, PaginationVariant } from '@ez-kit/data-grid-react'

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
const LABEL_CLASS = 'mr-3 flex items-center text-sm text-muted-foreground'

export function Pagination({
	variant,
	pageIndex,
	pageSize,
	pageCount,
	rowCount,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onPageChange,
}: PaginationProps) {
	const label = buildPaginationLabel({ variant, pageIndex, pageSize, pageCount, rowCount })
	// Page links need a known page count; without one `numbered` degrades to prev/next.
	const showLinks = variant === PaginationVariant.Numbered && pageCount !== undefined

	return (
		<ShadcnPagination
			className='mt-3'
			data-variant={variant}
		>
			{label !== undefined && <span className={LABEL_CLASS}>{label}</span>}
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						aria-disabled={!canPreviousPage}
						className={canPreviousPage ? undefined : DISABLED_CLASS}
						onClick={canPreviousPage ? onPreviousPage : undefined}
					/>
				</PaginationItem>
				{showLinks &&
					Array.from({ length: pageCount }).map((_, index) => (
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
