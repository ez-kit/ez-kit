'use client'

import { Pagination as HeroPagination } from '@heroui/react'

import type { PaginationProps } from '@ez-kit/data-grid-react'

export function Pagination({
	pageIndex,
	pageCount,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onPageChange,
}: PaginationProps) {
	return (
		<HeroPagination aria-label='Pagination'>
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
