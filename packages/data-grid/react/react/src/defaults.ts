import { DEFAULT_PAGE_SIZE } from '@ez-kit/data-grid-core'

import { DEFAULT_PAGE_BOUNDARIES, DEFAULT_PAGE_SIBLINGS } from './data-grid/page-window'
import { FilterChipsPosition, FilteringVariant, LoadMoreTrigger, PaginationVariant } from './types'

/**
 * Default commit debounce (ms) for **every** text filter input — the per-column ones and the
 * global search box alike. Typing into a filter is one gesture, so it debounces the same way
 * wherever the box lives; a grid that wants otherwise sets `globalFiltering.debounce`, which
 * overrides this for the search box only.
 *
 * `0` commits on every keystroke.
 */
export const DEFAULT_FILTER_DEBOUNCE_MS = 250

/**
 * Single source of truth for data-grid default option **values**.
 *
 * These are values only — no feature is turned on by them. The grid stays fully opt-in;
 * each field is the floor a normalizer / consumer falls back to when the resolved config
 * enabled a feature but left that sub-option undefined. Centralizing the values here removes
 * the literals that were previously duplicated across normalizers and components and gives
 * the docs a single place to describe.
 *
 * Override precedence is unchanged and handled upstream by the option-layer merge
 * (factory `defaults` < provider `defaults` < instance config); these values apply
 * last, only where the merged config left a slot undefined.
 */
export const DATA_GRID_DEFAULTS = {
	/**
	 * Pagination, both modes. Keyed by the **option path** it defaults, which is why the
	 * infinite-scroll tuning sits here and not under a separate `infinite` key: the options are
	 * `pagination.trigger` and `pagination.threshold`, and a constant a consumer reads to extend
	 * a default is useless if its shape is not the shape of the config.
	 */
	pagination: {
		/** `pageSize` mirrors the core default (one source across layers). */
		pageSize: DEFAULT_PAGE_SIZE,
		/** Offered by the PageSizer when `pagination.toolbar` is on and no list is supplied. */
		pageSizeOptions: [10, 20, 50, 100],
		variant: PaginationVariant.Numbered,
		/** `numbered` page-link window; mirrors the `buildPageWindow` defaults. */
		siblings: DEFAULT_PAGE_SIBLINGS,
		boundaries: DEFAULT_PAGE_BOUNDARIES,
		/** Infinite mode only — what makes the grid load the next page. */
		trigger: LoadMoreTrigger.Auto,
		/** Infinite mode only — how close to the edge that happens. */
		threshold: {
			/** Row distance that triggers a load on the virtualized path. */
			rows: 5,
			/** `IntersectionObserver` `rootMargin` (px) for the non-virtualized path. */
			px: 200,
		},
	},
	/** Cross-column global search input. Debounce falls back to `filtering.debounce`. */
	globalFiltering: {
		placeholder: 'Search…',
	},
	/** Column filtering controls. */
	filtering: {
		variant: FilteringVariant.Inline,
		debounce: DEFAULT_FILTER_DEBOUNCE_MS,
		chips: { position: FilterChipsPosition.Above },
		toolbar: { alwaysShow: false },
	},
} as const
