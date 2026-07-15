'use client'

import { PaginationVariant } from '@ez-kit/data-grid-react'
import { Pagination as HeroPagination } from '@heroui/react'


import type { PaginationProps } from '@ez-kit/data-grid-react'

const LABEL_CLASS = 'px-2 text-sm text-default-500'
const RANGE_SEPARATOR = '–'
const OF_LABEL = 'of'
const PAGE_LABEL = 'Page'
const PREVIOUS_LABEL = 'Previous'
const NEXT_LABEL = 'Next'
const PAGINATION_ARIA_LABEL = 'Pagination'

function buildRangeLabel(pageIndex: number, pageSize: number, rowCount: number): string {
	const from = pageIndex * pageSize + 1
	const to = Math.min((pageIndex + 1) * pageSize, rowCount)
	return `${String(from)}${RANGE_SEPARATOR}${String(to)} ${OF_LABEL} ${String(rowCount)}`
}

function buildPageLabel(pageIndex: number, pageCount: number): string {
	return `${PAGE_LABEL} ${String(pageIndex + 1)} ${OF_LABEL} ${String(pageCount)}`
}

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
	const rangeLabel = rowCount !== undefined ? buildRangeLabel(pageIndex, pageSize, rowCount) : undefined
	// `simple` is defined by its range label, so when the total is unknown it degrades to
	// the page label rather than rendering bare prev/next with no context.
	const label =
		variant === PaginationVariant.Compact
			? buildPageLabel(pageIndex, pageCount)
			: (rangeLabel ?? (variant === PaginationVariant.Simple ? buildPageLabel(pageIndex, pageCount) : undefined))

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
				{variant === PaginationVariant.Numbered &&
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
