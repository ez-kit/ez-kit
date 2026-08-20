'use client'

import { buildPageWindow, buildPaginationLabel, PAGE_GAP, PaginationVariants } from '@ez-kit/data-grid-react'
import { Pagination as HeroPagination } from '@heroui/react'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const LABEL_CLASS = 'dg-pagination-label px-2 text-sm'
const PREVIOUS_LABEL = 'Previous'
const NEXT_LABEL = 'Next'
const PAGINATION_ARIA_LABEL = 'Pagination'

export function Pagination({
	variant,
	pageIndex,
	pageSize,
	pageCount,
	rowCount,
	siblings,
	boundaries,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onPageChange,
}: PaginationProps) {
	const label = buildPaginationLabel({ variant, pageIndex, pageSize, pageCount, rowCount })
	// Page links need a known page count; without one `numbered` degrades to prev/next.
	const showLinks = variant === PaginationVariants.Numbered && pageCount !== undefined
	// Windowed, never one link per page: 100 pages render as `1 … 4 5 6 … 100`, not 100 controls.
	const pages = showLinks ? buildPageWindow({ pageIndex, pageCount, siblings, boundaries }) : []

	return (
		<HeroPagination
			aria-label={PAGINATION_ARIA_LABEL}
			className='mt-3'
			data-variant={variant}
		>
			{label !== undefined && (
				<HeroPagination.Item>
					<span className={LABEL_CLASS}>{label}</span>
				</HeroPagination.Item>
			)}
			<HeroPagination.Content>
				<HeroPagination.Item>
					<HeroPagination.Previous
						isDisabled={!canPreviousPage}
						onPress={onPreviousPage}
					>
						{PREVIOUS_LABEL}
					</HeroPagination.Previous>
				</HeroPagination.Item>
				{pages.map((page, slot) =>
					page === PAGE_GAP ? (
						<HeroPagination.Item key={`${PAGE_GAP}-${String(slot)}`}>
							<HeroPagination.Ellipsis />
						</HeroPagination.Item>
					) : (
						<HeroPagination.Item key={page}>
							<HeroPagination.Link
								isActive={page === pageIndex}
								onPress={() => {
									onPageChange(page)
								}}
							>
								{page + 1}
							</HeroPagination.Link>
						</HeroPagination.Item>
					),
				)}
				<HeroPagination.Item>
					<HeroPagination.Next
						isDisabled={!canNextPage}
						onPress={onNextPage}
					>
						{NEXT_LABEL}
					</HeroPagination.Next>
				</HeroPagination.Item>
			</HeroPagination.Content>
		</HeroPagination>
	)
}
