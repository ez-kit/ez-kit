import { DEFAULT_PAGE_BOUNDARIES, DEFAULT_PAGE_SIBLINGS, PaginationVariants } from '@ez-kit/data-grid-react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './pagination'

import type { PaginationProps } from '@ez-kit/data-grid-react'

/** A known-total, mid-range page — overridden per case. */
function makeProps(overrides: Partial<PaginationProps> = {}): PaginationProps {
	return {
		variant: PaginationVariants.Numbered,
		pageIndex: 0,
		pageSize: 10,
		pageCount: 5,
		rowCount: 50,
		siblings: DEFAULT_PAGE_SIBLINGS,
		boundaries: DEFAULT_PAGE_BOUNDARIES,
		canPreviousPage: false,
		canNextPage: true,
		onPreviousPage: vi.fn(),
		onNextPage: vi.fn(),
		onFirstPage: vi.fn(),
		onLastPage: vi.fn(),
		onPageChange: vi.fn(),
		...overrides,
	}
}

/**
 * Props for a grid whose total is unknown. "Unknown" is the *absence* of `pageCount` /
 * `rowCount`, not the presence of `undefined` — that distinction is what
 * `exactOptionalPropertyTypes` enforces, so model it by omitting the keys.
 */
function makeUnknownTotalProps(overrides: Partial<PaginationProps> = {}): PaginationProps {
	const { pageCount: _pageCount, rowCount: _rowCount, ...rest } = makeProps(overrides)
	return rest
}

/** A manually paginated grid given `pageCount` but no `rowCount` — pages known, total not. */
function makeUnknownRowCountProps(overrides: Partial<PaginationProps> = {}): PaginationProps {
	const { rowCount: _rowCount, ...rest } = makeProps(overrides)
	return rest
}

const pageLinks = (container: HTMLElement): string[] =>
	Array.from(container.querySelectorAll('a'))
		.map((a) => a.textContent)
		.filter((t) => /^\d+$/.test(t))

describe('shadcn Pagination — numbered', () => {
	it('renders a link per page', () => {
		const { container } = render(<Pagination {...makeProps()} />)

		expect(pageLinks(container)).toEqual(['1', '2', '3', '4', '5'])
	})

	it('shows the range label alongside the links', () => {
		render(<Pagination {...makeProps()} />)

		expect(screen.getByText('1–10 of 50')).toBeDefined()
	})

	// Regression: pageSize used to be derived as ceil(rowCount / pageCount), which read
	// "1–6 of 11" on a partial last page.
	it('clamps the range label on a partial last page', () => {
		render(<Pagination {...makeProps({ pageIndex: 1, pageCount: 2, rowCount: 11 })} />)

		expect(screen.getByText('11–11 of 11')).toBeDefined()
	})

	it('reports the variant so kit CSS can target it', () => {
		const { container } = render(<Pagination {...makeProps()} />)

		expect(container.querySelector('[data-variant="numbered"]')).not.toBeNull()
	})

	it('degrades to prev/next when the page count is unknown', () => {
		const { container } = render(<Pagination {...makeUnknownTotalProps()} />)

		expect(pageLinks(container)).toEqual([])
	})

	// Regression (#106): 100 pages used to render 100 live page links in one flex row, blowing
	// out the footer. The window keeps it to boundaries + the current page's neighbours.
	it('windows a large page count instead of a link per page', () => {
		const { container } = render(<Pagination {...makeProps({ pageIndex: 49, pageCount: 100 })} />)

		expect(pageLinks(container)).toEqual(['1', '49', '50', '51', '100'])
	})

	it('marks the hidden runs of a windowed strip with ellipses', () => {
		const { container } = render(<Pagination {...makeProps({ pageIndex: 49, pageCount: 100 })} />)

		expect(container.querySelectorAll('[data-slot="pagination-ellipsis"]')).toHaveLength(2)
	})
})

describe('shadcn Pagination — simple', () => {
	it('shows the range label and no page links', () => {
		const { container } = render(<Pagination {...makeProps({ variant: PaginationVariants.Simple })} />)

		expect(screen.getByText('1–10 of 50')).toBeDefined()
		expect(pageLinks(container)).toEqual([])
	})

	// Regression: an unknown total under manual pagination produced the inverted "21–10 of 10".
	it('falls back to the page label when the total is unknown', () => {
		render(<Pagination {...makeUnknownRowCountProps({ variant: PaginationVariants.Simple, pageIndex: 2 })} />)

		expect(screen.getByText('Page 3 of 5')).toBeDefined()
	})
})

describe('shadcn Pagination — compact', () => {
	it('shows the page label and no page links', () => {
		const { container } = render(<Pagination {...makeProps({ variant: PaginationVariants.Compact })} />)

		expect(screen.getByText('Page 1 of 5')).toBeDefined()
		expect(pageLinks(container)).toEqual([])
	})

	// Regression: the core -1 unknown-pageCount sentinel rendered as "Page 1 of -1".
	it('omits the total when the page count is unknown', () => {
		render(<Pagination {...makeUnknownTotalProps({ variant: PaginationVariants.Compact })} />)

		expect(screen.getByText('Page 1')).toBeDefined()
	})
})
