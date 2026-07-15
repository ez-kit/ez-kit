'use client'

import { buildPaginationLabel, PaginationVariant } from '@ez-kit/data-grid-react'
import { Pagination as HeroPagination } from '@heroui/react'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const LABEL_CLASS = 'px-2 text-sm text-default-500'
const PREVIOUS_LABEL = 'Previous'
const NEXT_LABEL = 'Next'
const PAGINATION_ARIA_LABEL = 'Pagination'

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
				{showLinks &&
					Array.from({ length: pageCount }).map((_, index) => (
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
						{NEXT_LABEL}
					</HeroPagination.Next>
				</HeroPagination.Item>
			</HeroPagination.Content>
		</HeroPagination>
	)
}
