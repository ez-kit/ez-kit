'use client'

import { buildPageWindow, PAGE_GAP } from '@ez-kit/data-grid-react'
import { Pagination as HeroPagination } from '@heroui/react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const LABEL_CLASS = 'dg-pagination-label'
const PREVIOUS_LABEL = 'Previous'
const NEXT_LABEL = 'Next'
const PAGINATION_ARIA_LABEL = 'Pagination'
const FIRST_ARIA_LABEL = 'Go to first page'
const LAST_ARIA_LABEL = 'Go to last page'

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
	// Page links need a known page count; without one they degrade to prev/next.
	const showLinks = links && pageCount !== undefined
	// Windowed, never one link per page: 100 pages render as `1 … 4 5 6 … 100`, not 100 controls.
	const pages = showLinks ? buildPageWindow({ pageIndex, pageCount, siblings, boundaries }) : []

	return (
		<HeroPagination
			aria-label={PAGINATION_ARIA_LABEL}
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
							aria-label={FIRST_ARIA_LABEL}
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
				{edges && (
					<HeroPagination.Item>
						<HeroPagination.Link
							aria-label={LAST_ARIA_LABEL}
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
