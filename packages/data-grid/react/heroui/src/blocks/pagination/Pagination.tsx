'use client'

import { buildPageWindow, PAGE_GAP, useGridMessages } from '@ez-kit/data-grid-react'
import { Pagination as HeroPagination } from '@heroui/react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const LABEL_CLASS = 'dg-pagination-label'

export function Pagination({
	links,
	edges,
	label,
	pageIndex,
	pageCount,
	siblings,
	boundaries,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onFirstPage,
	onLastPage,
	onPageChange,
}: PaginationProps) {
	const messages = useGridMessages()
	// Page links need a known page count; without one they degrade to prev/next.
	const showLinks = links && pageCount !== undefined
	// Windowed, never one link per page: 100 pages render as `1 … 4 5 6 … 100`, not 100 controls.
	const pages = showLinks ? buildPageWindow({ pageIndex, pageCount, siblings, boundaries }) : []

	return (
		<HeroPagination
			aria-label={messages.pagination.navigation}
			className='mt-3'
			data-slot='pagination'
			data-links={links || undefined}
			data-edges={edges || undefined}
		>
			{label !== undefined && <HeroPagination.Summary className={LABEL_CLASS}>{label}</HeroPagination.Summary>}
			<HeroPagination.Content>
				{edges && (
					<HeroPagination.Item>
						<HeroPagination.Link
							aria-label={messages.pagination.first}
							isDisabled={!canPreviousPage}
							onPress={onFirstPage}
						>
							<ChevronsLeft size={16} />
						</HeroPagination.Link>
					</HeroPagination.Item>
				)}
				<HeroPagination.Item>
					<HeroPagination.Previous
						isDisabled={!canPreviousPage}
						onPress={onPreviousPage}
					>
						{messages.pagination.previous}
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
						{messages.pagination.next}
					</HeroPagination.Next>
				</HeroPagination.Item>
				{edges && (
					<HeroPagination.Item>
						<HeroPagination.Link
							aria-label={messages.pagination.last}
							isDisabled={!canNextPage}
							onPress={onLastPage}
						>
							<ChevronsRight size={16} />
						</HeroPagination.Link>
					</HeroPagination.Item>
				)}
			</HeroPagination.Content>
		</HeroPagination>
	)
}
