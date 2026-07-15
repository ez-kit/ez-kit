import { PaginationVariant } from '@ez-kit/data-grid-react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './Pagination'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const FIRST_GLYPH = '«'
const LAST_GLYPH = '»'

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

const pageLinks = (): string[] =>
	screen
		.getAllByRole('button')
		.map((b) => b.textContent)
		.filter((t) => /^\d+$/.test(t))

describe('native Pagination — numbered', () => {
	it('renders a link per page plus the first/last jumps', () => {
		render(<Pagination {...makeProps()} />)

		expect(pageLinks()).toEqual(['1', '2', '3', '4', '5'])
		expect(screen.getByText(FIRST_GLYPH)).toBeDefined()
		expect(screen.getByText(LAST_GLYPH)).toBeDefined()
	})

	it('marks the current page for assistive tech', () => {
		render(<Pagination {...makeProps({ pageIndex: 2 })} />)

		expect(screen.getByRole('button', { current: 'page' }).textContent).toBe('3')
	})

	it('keeps a position indicator (the range label) alongside the links', () => {
		render(<Pagination {...makeProps()} />)

		expect(screen.getByText('1–10 of 50')).toBeDefined()
	})

	it('reports the variant so kit CSS can target it', () => {
		const { container } = render(<Pagination {...makeProps()} />)

		expect(container.querySelector('[data-variant="numbered"]')).not.toBeNull()
	})
})

describe('native Pagination — numbered with an unknown page count', () => {
	it('drops the page links, which cannot be enumerated', () => {
		render(<Pagination {...makeUnknownTotalProps()} />)

		expect(pageLinks()).toEqual([])
	})

	it('drops the last-page jump, which has no target', () => {
		render(<Pagination {...makeUnknownTotalProps()} />)

		expect(screen.queryByText(LAST_GLYPH)).toBeNull()
	})

	// Regression: `«` was gated behind the same predicate as `»`, but jumping to the first
	// page is always page 0 — it needs no total.
	it('keeps the first-page jump, which is always page 0', () => {
		render(<Pagination {...makeUnknownTotalProps()} />)

		expect(screen.getByText(FIRST_GLYPH)).toBeDefined()
	})
})

describe('native Pagination — simple / compact', () => {
	it('simple shows the range label and no page links', () => {
		render(<Pagination {...makeProps({ variant: PaginationVariant.Simple })} />)

		expect(screen.getByText('1–10 of 50')).toBeDefined()
		expect(pageLinks()).toEqual([])
	})

	it('compact shows the page label and no page links', () => {
		render(<Pagination {...makeProps({ variant: PaginationVariant.Compact })} />)

		expect(screen.getByText('Page 1 of 5')).toBeDefined()
		expect(pageLinks()).toEqual([])
	})

	it('neither renders the first/last jumps', () => {
		render(<Pagination {...makeProps({ variant: PaginationVariant.Simple })} />)

		expect(screen.queryByText(FIRST_GLYPH)).toBeNull()
		expect(screen.queryByText(LAST_GLYPH)).toBeNull()
	})
})
