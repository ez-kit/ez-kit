import { PaginationVariant } from '@ez-kit/data-grid-react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './Pagination'

import type { PaginationProps } from '@ez-kit/data-grid-react'

/** A known-total, mid-range page — overridden per case. */
function makeProps(overrides: Partial<PaginationProps> = {}): PaginationProps {
	return {
		variant: PaginationVariant.Numbered,
		pageIndex: 0,
		pageSize: 10,
		pageCount: 5,
		rowCount: 50,
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
	Array.from(container.querySelectorAll('a, button'))
		.map((el) => el.textContent)
		.filter((t) => /^\d+$/.test(t))

describe('heroui Pagination — numbered', () => {
	it('renders a link per page', () => {
		const { container } = render(<Pagination {...makeProps()} />)

		expect(pageLinks(container)).toEqual(['1', '2', '3', '4', '5'])
	})

	it('shows the range label alongside the links', () => {
		render(<Pagination {...makeProps()} />)

		expect(screen.getByText('1–10 of 50')).toBeDefined()
	})

	it('reports the variant so kit CSS can target it', () => {
		const { container } = render(<Pagination {...makeProps()} />)

		expect(container.querySelector('[data-variant="numbered"]')).not.toBeNull()
	})

	it('degrades to prev/next when the page count is unknown', () => {
		const { container } = render(<Pagination {...makeUnknownTotalProps()} />)

		expect(pageLinks(container)).toEqual([])
	})
})

describe('heroui Pagination — simple / compact', () => {
	it('simple shows the range label and no page links', () => {
		const { container } = render(<Pagination {...makeProps({ variant: PaginationVariant.Simple })} />)

		expect(screen.getByText('1–10 of 50')).toBeDefined()
		expect(pageLinks(container)).toEqual([])
	})

	// Regression: an unknown total under manual pagination produced the inverted "21–10 of 10".
	it('simple falls back to the page label when the total is unknown', () => {
		render(<Pagination {...makeUnknownRowCountProps({ variant: PaginationVariant.Simple, pageIndex: 2 })} />)

		expect(screen.getByText('Page 3 of 5')).toBeDefined()
	})

	it('compact shows the page label', () => {
		render(<Pagination {...makeProps({ variant: PaginationVariant.Compact })} />)

		expect(screen.getByText('Page 1 of 5')).toBeDefined()
	})

	// Regression: the core -1 unknown-pageCount sentinel rendered as "Page 1 of -1".
	it('compact omits the total when the page count is unknown', () => {
		render(<Pagination {...makeUnknownTotalProps({ variant: PaginationVariant.Compact })} />)

		expect(screen.getByText('Page 1')).toBeDefined()
	})
})
