import { describe, expect, it } from 'vitest'

import { PaginationVariants } from '../types'

import { buildPaginationLabel } from './pagination-label'

const PAGE_SIZE = 10

describe('buildPaginationLabel — numbered', () => {
	it('shows the range label when the total is known', () => {
		// Arrange / Act
		const label = buildPaginationLabel({
			variant: PaginationVariants.Numbered,
			pageIndex: 0,
			pageSize: PAGE_SIZE,
			pageCount: 5,
			rowCount: 50,
		})

		// Assert
		expect(label).toBe('1–10 of 50')
	})

	it('shows no label when the total is unknown (the page links carry position)', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Numbered,
			pageIndex: 0,
			pageSize: PAGE_SIZE,
			pageCount: 5,
		})

		expect(label).toBeUndefined()
	})
})

describe('buildPaginationLabel — simple', () => {
	it('reports the exact slice on a full page', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Simple,
			pageIndex: 2,
			pageSize: PAGE_SIZE,
			pageCount: 5,
			rowCount: 50,
		})

		expect(label).toBe('21–30 of 50')
	})

	// Regression: the range used to be built from a pageSize derived as
	// `ceil(rowCount / pageCount)`, which collapsed to 6 here and read "1–6 of 11".
	it('clamps the range to the total on a partial last page', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Simple,
			pageIndex: 1,
			pageSize: PAGE_SIZE,
			pageCount: 2,
			rowCount: 11,
		})

		expect(label).toBe('11–11 of 11')
	})

	// Regression: an unknown total was detected as `getRowCount() > 0`, which under manual
	// pagination is the loaded page length — producing the inverted range "21–10 of 10".
	it('falls back to the page label when the total is unknown — never an inverted range', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Simple,
			pageIndex: 2,
			pageSize: PAGE_SIZE,
			pageCount: 5,
		})

		expect(label).toBe('Page 3 of 5')
	})

	it('degrades to the bare page number when neither total is known', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Simple,
			pageIndex: 2,
			pageSize: PAGE_SIZE,
		})

		expect(label).toBe('Page 3')
	})

	it('reports an empty grid as 0–0 of 0 rather than 1–0 of 0', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Simple,
			pageIndex: 0,
			pageSize: PAGE_SIZE,
			pageCount: 0,
			rowCount: 0,
		})

		expect(label).toBe('0–0 of 0')
	})

	// Regression: a server-paginated grid does not rewind when `rowCount` shrinks under it
	// (`autoResetPageIndex` defaults to `!manualPagination`), so the page can sit past the
	// end of the total. Clamping only `to` produced the inverted "21–5 of 5".
	it('reports a page past the end of a shrunken total as holding no rows', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Simple,
			pageIndex: 2,
			pageSize: PAGE_SIZE,
			pageCount: 1,
			rowCount: 5,
		})

		expect(label).toBe('0–0 of 5')
	})

	it('still reports the last partial page when it holds rows', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Simple,
			pageIndex: 4,
			pageSize: PAGE_SIZE,
			pageCount: 5,
			rowCount: 42,
		})

		expect(label).toBe('41–42 of 42')
	})
})

describe('buildPaginationLabel — compact', () => {
	it('shows "Page X of Y" and ignores a known total', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Compact,
			pageIndex: 0,
			pageSize: PAGE_SIZE,
			pageCount: 5,
			rowCount: 50,
		})

		expect(label).toBe('Page 1 of 5')
	})

	// Regression: `pageCount` arrived as the raw UNKNOWN_PAGE_COUNT (-1) sentinel and was
	// rendered verbatim as the user-visible text "Page 1 of -1".
	it('omits the total when the page count is unknown', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Compact,
			pageIndex: 0,
			pageSize: PAGE_SIZE,
		})

		expect(label).toBe('Page 1')
	})

	it('omits a zero total on an empty grid rather than saying "Page 1 of 0"', () => {
		const label = buildPaginationLabel({
			variant: PaginationVariants.Compact,
			pageIndex: 0,
			pageSize: PAGE_SIZE,
			pageCount: 0,
			rowCount: 0,
		})

		expect(label).toBe('Page 1')
	})
})
