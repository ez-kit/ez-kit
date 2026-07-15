import { DEFAULT_PAGE_SIZE, defineColumns } from '@ez-kit/data-grid-core'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DataGridOptionsProvider, mergeGridOptionLayers } from './data-grid-options-context'
import { DATA_GRID_DEFAULTS, DEFAULT_FILTER_DEBOUNCE_MS } from './defaults'
import { PaginationVariants } from './types'
import {
	FILTER_CHIPS_KEY,
	GLOBAL_FILTERING_KEY,
	INFINITE_KEY,
	PAGINATION_VARIANT_KEY,
	useDataGrid,
} from './use-data-grid'

import type { DataGridDefaultOptions } from './data-grid-options-context'
import type {
	NormalizedFilterChipsConfig,
	NormalizedGlobalFilteringConfig,
	NormalizedInfiniteConfig,
} from './use-data-grid'
import type * as DataGridCore from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

type DataGridCoreModule = typeof DataGridCore

// Spy on `createTable` while keeping the real implementation — the strip of React-only
// pagination fields is only observable at that call site.
const createTableSpy = vi.hoisted(() => vi.fn())
vi.mock('@ez-kit/data-grid-core', async (importOriginal) => {
	const actual = await importOriginal<DataGridCoreModule>()
	createTableSpy.mockImplementation(actual.createTable)
	return { ...actual, createTable: createTableSpy }
})

type User = { id: number; name: string }

const USERS: User[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = defineColumns<User>([{ accessorKey: 'name' }])

const symbols = (table: unknown) => table as Record<symbol, unknown>

beforeEach(() => {
	createTableSpy.mockClear()
})

// ── Named-default values (single source) ──────────────────────────────────────
// These lock the documented default *values*. They must not drift: the whole point of
// the refactor is that behaviour is unchanged, only centralized.
describe('DATA_GRID_DEFAULTS — named default values', () => {
	it('mirrors the core page size (single source across layers)', () => {
		expect(DATA_GRID_DEFAULTS.pagination.pageSize).toBe(DEFAULT_PAGE_SIZE)
		expect(DEFAULT_PAGE_SIZE).toBe(10)
	})

	it('page-based pagination renders the numbered variant by default', () => {
		expect(DATA_GRID_DEFAULTS.pagination.variant).toBe(PaginationVariants.Numbered)
	})

	it('global search input defaults', () => {
		expect(DATA_GRID_DEFAULTS.globalFiltering.placeholder).toBe('Search…')
		expect(DATA_GRID_DEFAULTS.globalFiltering.debounce).toBe(250)
	})

	it('column filtering defaults', () => {
		expect(DATA_GRID_DEFAULTS.filtering.variant).toBe('inline')
		expect(DATA_GRID_DEFAULTS.filtering.debounce).toBe(DEFAULT_FILTER_DEBOUNCE_MS)
		expect(DEFAULT_FILTER_DEBOUNCE_MS).toBe(0)
		expect(DATA_GRID_DEFAULTS.filtering.chips.position).toBe('above')
		expect(DATA_GRID_DEFAULTS.filtering.clearButton.alwaysShow).toBe(false)
	})

	it('infinite-scroll detection defaults', () => {
		expect(DATA_GRID_DEFAULTS.infinite.trigger).toBe('auto')
		expect(DATA_GRID_DEFAULTS.infinite.threshold.rows).toBe(5)
		expect(DATA_GRID_DEFAULTS.infinite.threshold.px).toBe(200)
	})
})

// ── Effective defaults resolve to the named constants ─────────────────────────
// Each enabled-without-options feature must land exactly on DATA_GRID_DEFAULTS.
describe('useDataGrid — effective defaults resolve to named defaults', () => {
	it('pagination: true → pageSize is the named default', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, pagination: true }))
		expect(result.current.table.getState().pagination.pageSize).toBe(DATA_GRID_DEFAULTS.pagination.pageSize)
	})

	it('pagination without a variant → resolves to the named default', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, pagination: true }))
		expect(symbols(result.current.table)[PAGINATION_VARIANT_KEY]).toBe(DATA_GRID_DEFAULTS.pagination.variant)
	})

	it('pagination.variant → stored on the instance for Pagination to read', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { variant: PaginationVariants.Simple } }),
		)
		expect(symbols(result.current.table)[PAGINATION_VARIANT_KEY]).toBe(PaginationVariants.Simple)
	})

	// The public option is the `PaginationVariant` string union — `PaginationVariants` is only
	// sugar. A plain literal must compile and behave identically; typing the option as an enum
	// would reject this call.
	it('pagination.variant as a plain string → accepted, same as the named member', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { variant: 'simple' } }),
		)
		expect(symbols(result.current.table)[PAGINATION_VARIANT_KEY]).toBe(PaginationVariants.Simple)
	})

	// Asserting on `table.options` / `getState().pagination` would be unfalsifiable: core only
	// *reads* fields off `config.pagination` and rebuilds state from pageIndex/pageSize, so an
	// unstripped `variant` would be inert there and the test would pass regardless. The
	// invariant worth guarding is what `createTable` is actually handed — so spy on that.
	it('pagination.variant is display-only → never reaches the config handed to createTable', () => {
		renderHook(() =>
			useDataGrid({
				data: USERS,
				columns: COLUMNS,
				pagination: { variant: PaginationVariants.Compact, pageSize: 10 },
			}),
		)

		const config = createTableSpy.mock.calls[0]?.[0] as { pagination?: object } | undefined
		expect(config?.pagination).toBeDefined()
		expect(config?.pagination).not.toHaveProperty('variant')
		// Sanity: the spy sees a real config, so the assertion above can actually fail.
		expect(config?.pagination).toHaveProperty('pageSize', 10)
	})

	it('globalFiltering: true → placeholder/debounce are the named defaults', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, globalFiltering: true }))
		const cfg = symbols(result.current.table)[GLOBAL_FILTERING_KEY] as NormalizedGlobalFilteringConfig
		expect(cfg.placeholder).toBe(DATA_GRID_DEFAULTS.globalFiltering.placeholder)
		expect(cfg.debounce).toBe(DATA_GRID_DEFAULTS.globalFiltering.debounce)
	})

	it('filtering.chips: true → position is the named default', () => {
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS, filtering: { chips: true } }))
		const cfg = symbols(result.current.table)[FILTER_CHIPS_KEY] as NormalizedFilterChipsConfig
		expect(cfg.position).toBe(DATA_GRID_DEFAULTS.filtering.chips.position)
	})

	it('pagination infinite → trigger/threshold are the named defaults', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { mode: 'infinite' } }),
		)
		const cfg = symbols(result.current.table)[INFINITE_KEY] as NormalizedInfiniteConfig
		expect(cfg.trigger).toBe(DATA_GRID_DEFAULTS.infinite.trigger)
		expect(cfg.threshold).toEqual({ rows: DATA_GRID_DEFAULTS.infinite.threshold.rows })
	})
})

// ── Overrides still win over the named defaults ───────────────────────────────
describe('useDataGrid — overrides beat the named defaults', () => {
	const OVERRIDE_PAGE_SIZE = 25

	it('instance config wins', () => {
		const { result } = renderHook(() =>
			useDataGrid({ data: USERS, columns: COLUMNS, pagination: { pageSize: OVERRIDE_PAGE_SIZE } }),
		)
		expect(result.current.table.getState().pagination.pageSize).toBe(OVERRIDE_PAGE_SIZE)
	})

	it('provider defaults win over the floor', () => {
		function Wrapper({ children }: { children: ReactNode }) {
			return (
				<DataGridOptionsProvider<User> defaults={{ pagination: { pageSize: OVERRIDE_PAGE_SIZE } }}>
					{children}
				</DataGridOptionsProvider>
			)
		}
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }), { wrapper: Wrapper })
		expect(result.current.table.getState().pagination.pageSize).toBe(OVERRIDE_PAGE_SIZE)
	})

	it('factory defaultOptions win over the floor', () => {
		const factory: DataGridDefaultOptions<User> = { pagination: { pageSize: OVERRIDE_PAGE_SIZE } }
		const { result } = renderHook(() => useDataGrid({ data: USERS, columns: COLUMNS }, factory))
		expect(result.current.table.getState().pagination.pageSize).toBe(OVERRIDE_PAGE_SIZE)
	})

	it('precedence: instance beats provider beats factory', () => {
		const merged = mergeGridOptionLayers<User>(
			{ pagination: { pageSize: 5 } },
			{ pagination: { pageSize: 15 } },
			{ data: USERS, columns: COLUMNS, pagination: { pageSize: OVERRIDE_PAGE_SIZE } },
		)
		expect(merged.pagination).toEqual({ pageSize: OVERRIDE_PAGE_SIZE })
	})
})
