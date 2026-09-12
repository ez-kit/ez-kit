'use client'

import { buildPageWindow, PAGE_GAP, useGridMessages } from '@ez-kit/data-grid-react'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'

import { Button } from '@grid-shadcn/components/ui/button'
import {
	Pagination as ShadcnPagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
} from '@grid-shadcn/components/ui/pagination'

import type { PaginationProps } from '@ez-kit/data-grid-react'
import type { ComponentProps, ReactNode } from 'react'

const LABEL_CLASS = 'flex items-center text-sm text-muted-foreground'

type ControlProps = {
	children: ReactNode
	isDisabled?: boolean
	isActive?: boolean
	/** Overrides the control's `data-slot`; page numbers and edge jumps keep the default. */
	slotName?: string
} & Omit<ComponentProps<typeof Button>, 'asChild' | 'disabled' | 'variant'>

/**
 * One page control.
 *
 * Deliberately **not** the vendored `PaginationLink`: upstream shadcn's pagination navigates by
 * href, so its control is an `<a>`, and this grid pages by `onClick` and passes no href. An
 * `<a>` without one computes to the generic role and takes no focus — the controls were
 * unreachable by keyboard, unannounced as buttons, and "disabled" only as `aria-disabled` plus
 * `pointer-events: none`, which no assistive technology reads off a generic element.
 *
 * A real `<button>` fixes all of that and matches what the heroui kit already renders, so one
 * selector and one screen-reader experience now cover both. The wrapper primitives
 * (`Pagination`, `Content`, `Item`, `Ellipsis`) are still the vendored ones — per the rule,
 * this override lives here rather than in `components/ui/**`.
 *
 * `disabled` is the native attribute, and `Button`'s base class already carries
 * `disabled:pointer-events-none disabled:opacity-50`, so the look is unchanged.
 */
function PaginationControl({ children, isDisabled = false, isActive = false, slotName, ...props }: ControlProps) {
	return (
		<Button
			type='button'
			variant={isActive ? 'outline' : 'ghost'}
			disabled={isDisabled}
			// Present-or-absent rather than `data-active="false"`, as heroui writes it: one flag
			// with two spellings makes every selector over it kit-specific.
			{...(isActive ? { 'data-active': 'true', 'aria-current': 'page' as const } : {})}
			data-slot={slotName ?? 'pagination-link'}
			{...props}
		>
			{children}
		</Button>
	)
}

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
		<ShadcnPagination
			// shadcn's root centres the whole bar (`mx-auto flex w-full justify-center`), which is
			// its blog-pagination default. A grid footer reads label-left / controls-right, and
			// that is also where a footer-placed PageSizer lands — so both kits use the layout
			// heroui's `.pagination` already has.
			className='mt-3 justify-between'
			aria-label={messages.pagination.navigation}
			data-slot='pagination'
			data-links={links || undefined}
			data-edges={edges || undefined}
		>
			{/* Named `pagination-summary` after heroui's `Pagination.Summary`, which carries that slot
			    of its own: the footer's text is one thing, and a consumer or a browser test should
			    not have to know which kit it is reading it out of. */}
			{label !== undefined && (
				<span
					data-slot='pagination-summary'
					className={LABEL_CLASS}
				>
					{label}
				</span>
			)}
			<PaginationContent>
				{edges && (
					<PaginationItem>
						<PaginationControl
							size='icon'
							aria-label={messages.pagination.first}
							isDisabled={!canPreviousPage}
							onClick={onFirstPage}
						>
							<ChevronsLeftIcon />
						</PaginationControl>
					</PaginationItem>
				)}
				<PaginationItem>
					<PaginationControl
						slotName='pagination-previous'
						className='pl-1.5!'
						aria-label={messages.pagination.previous}
						isDisabled={!canPreviousPage}
						onClick={onPreviousPage}
					>
						<ChevronLeftIcon data-icon='inline-start' />
						<span className='hidden sm:block'>{messages.pagination.previous}</span>
					</PaginationControl>
				</PaginationItem>
				{pages.map((page, slot) =>
					page === PAGE_GAP ? (
						<PaginationItem key={`${PAGE_GAP}-${String(slot)}`}>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={page}>
							<PaginationControl
								size='icon'
								isActive={page === pageIndex}
								onClick={() => {
									onPageChange(page)
								}}
							>
								{page + 1}
							</PaginationControl>
						</PaginationItem>
					),
				)}
				<PaginationItem>
					<PaginationControl
						slotName='pagination-next'
						className='pr-1.5!'
						aria-label={messages.pagination.next}
						isDisabled={!canNextPage}
						onClick={onNextPage}
					>
						<span className='hidden sm:block'>{messages.pagination.next}</span>
						<ChevronRightIcon data-icon='inline-end' />
					</PaginationControl>
				</PaginationItem>
				{edges && (
					<PaginationItem>
						<PaginationControl
							size='icon'
							aria-label={messages.pagination.last}
							isDisabled={!canNextPage}
							onClick={onLastPage}
						>
							<ChevronsRightIcon />
						</PaginationControl>
					</PaginationItem>
				)}
			</PaginationContent>
		</ShadcnPagination>
	)
}
