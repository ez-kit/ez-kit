import { DEFAULT_PAGE_BOUNDARIES, DEFAULT_PAGE_SIBLINGS } from '@ez-kit/data-grid-react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './PaginationBar'

import type { PaginationProps } from '@ez-kit/data-grid-react'

/** A known-total, mid-range page — overridden per case. */
function makeProps(overrides: Partial<PaginationProps> = {}): PaginationProps {
	return {
		links: true,
		edges: false,
		pageIndex: 0,
		pageSize: 10,
		pageCount: 5,
		rowCount: 50,
		// Already resolved by `<DataGrid.Pagination>` — which string a label form gets is
		// `buildPaginationLabel`'s job and is tested there, not here.
		label: '1–10 of 50',
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

const pageLinks = (container: HTMLElement): string[] =>
	Array.from(container.querySelectorAll('a'))
		.map((a) => a.textContent)
		.filter((t) => /^\d+$/.test(t))

describe('shadcn Pagination — numbered', () => {
	it('renders a link per page', () => {
		const { container } = render(<Pagination {...makeProps()} />)

		expect(pageLinks(container)).toEqual(['1', '2', '3', '4', '5'])
	})

	it('renders the resolved label alongside the links', () => {
		render(<Pagination {...makeProps()} />)

		expect(screen.getByText('1–10 of 50')).toBeDefined()
	})

	it('renders no label when the react layer resolved none', () => {
		const { label: _label, ...rest } = makeProps()
		render(<Pagination {...rest} />)

		expect(screen.queryByText('1–10 of 50')).toBeNull()
	})

	it('reports the active controls so kit CSS can target them', () => {
		const { container } = render(<Pagination {...makeProps()} />)

		expect(container.querySelector('[data-links]')).not.toBeNull()
		expect(container.querySelector('[data-edges]')).toBeNull()
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

describe('shadcn Pagination — links off', () => {
	it('shows the label and no page links', () => {
		const { container } = render(<Pagination {...makeProps({ links: false })} />)

		expect(screen.getByText('1–10 of 50')).toBeDefined()
		expect(pageLinks(container)).toEqual([])
	})
})

describe('shadcn Pagination — edges', () => {
	it('shows the label it is given and no page links', () => {
		const { container } = render(<Pagination {...makeProps({ links: false, edges: true, label: 'Page 1 of 5' })} />)

		expect(screen.getByText('Page 1 of 5')).toBeDefined()
		expect(pageLinks(container)).toEqual([])
	})

	it('jumps to the first and last page', () => {
		const onFirstPage = vi.fn()
		const onLastPage = vi.fn()
		render(
			<Pagination
				{...makeProps({
					links: false,
					edges: true,
					pageIndex: 2,
					canPreviousPage: true,
					onFirstPage,
					onLastPage,
				})}
			/>,
		)

		fireEvent.click(screen.getByLabelText('Go to first page'))
		fireEvent.click(screen.getByLabelText('Go to last page'))

		expect(onFirstPage).toHaveBeenCalledTimes(1)
		expect(onLastPage).toHaveBeenCalledTimes(1)
	})

	it('renders no edge controls until `edges` asks for them', () => {
		render(<Pagination {...makeProps()} />)

		expect(screen.queryByLabelText('Go to first page')).toBeNull()
		expect(screen.queryByLabelText('Go to last page')).toBeNull()
	})
})
