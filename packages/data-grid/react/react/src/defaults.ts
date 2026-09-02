import {
	ColumnResizeMode,
	CreatingMode,
	DEFAULT_PAGE_SIZE,
	DEFAULT_ROW_ESTIMATE_SIZE,
	DEFAULT_ROW_OVERSCAN,
	DEFAULT_VALIDATE_DEBOUNCE_MS,
	EditingMode,
	ExpandingMode,
	GridDirection,
	LinkTarget,
	MultiSortEvent,
	PaginationMode,
	RowActionsVariant,
	ValidateOn,
} from '@ez-kit/data-grid-core'

import { DEFAULT_PAGE_BOUNDARIES, DEFAULT_PAGE_SIBLINGS } from './data-grid/page-window'
import { ActionBarVariant, FilterChipsPosition, FilteringVariant, LoadMoreTrigger, PaginationVariant } from './types'

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
 * Single source of truth for data-grid default option **values** — **every** one of them, which
 * is the point. The docs' "Default Values" page is this table, and it promises completeness: a
 * default that lives only as a literal at its use site is a default nobody can read, extend, or
 * document, and for a long stretch that described most of them (`sorting.clearable`,
 * `selection.multi`, `expanding.mode`, the resize mode, the virtualizer's row estimate …).
 *
 * These are values only — no feature is turned on by them. The grid stays fully opt-in;
 * each field is the floor a normalizer / consumer falls back to when the resolved config
 * enabled a feature but left that sub-option undefined.
 *
 * Keyed by the **option path** it defaults, so `DATA_GRID_DEFAULTS.pagination.items` is the
 * floor under `pagination.items`. Values that core resolves are re-exported from core rather
 * than restated here, so the two cannot drift.
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
		items: [10, 20, 50, 100],
		/** What pagination does. */
		mode: PaginationMode.Pages,
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
		/** Auto-mounted in the toolbar as soon as global search is enabled. */
		toolbar: true,
	},
	/** Column filtering controls. */
	filtering: {
		variant: FilteringVariant.Inline,
		debounce: DEFAULT_FILTER_DEBOUNCE_MS,
		chips: { position: FilterChipsPosition.Above },
		toolbar: { alwaysShow: false },
		/** Faceted row models are opt-in — they cost a row model per column. */
		faceted: false,
	},
	/** Column sorting. Multi-column sort is off until `sorting.multi` opts in. */
	sorting: {
		/** First click sorts ascending. */
		descFirst: false,
		/** A third click clears the sort. */
		clearable: true,
		/** The floors under `sorting.multi.*`, which apply once multi-sort is on. */
		multi: {
			/** Gesture that extends the multi-sort set. */
			event: MultiSortEvent.Shift,
			/** A column may be dropped from the set. */
			removable: true,
		},
	},
	/** Row selection. */
	selection: {
		/** More than one row at a time. */
		multi: true,
		/** The floors under `selection.bar.*`. */
		bar: {
			/** Render mode of the shared action bar. */
			variant: ActionBarVariant.Floating,
		},
	},
	/** Row expanding. */
	expanding: {
		mode: ExpandingMode.SubContent,
	},
	/** Column resizing. */
	resizing: {
		/** The width follows the pointer live. */
		mode: ColumnResizeMode.OnChange,
	},
	/** Row virtualization. */
	virtualization: {
		row: {
			estimateSize: DEFAULT_ROW_ESTIMATE_SIZE,
			overscan: DEFAULT_ROW_OVERSCAN,
		},
	},
	/** The per-row actions column. */
	rowActions: {
		variant: RowActionsVariant.Inline,
	},
	/** Row editing. */
	editing: {
		mode: EditingMode.Row,
		validateOn: ValidateOn.Submit,
		debounce: DEFAULT_VALIDATE_DEBOUNCE_MS,
	},
	/** Row creation. */
	creating: {
		mode: CreatingMode.Row,
		validateOn: ValidateOn.Submit,
		debounce: DEFAULT_VALIDATE_DEBOUNCE_MS,
	},
	/** Presentational shell. `maxHeight` is applied by the structural stylesheet, not by JS. */
	layout: {
		/**
		 * One option, two floors: the stylesheet reads `--dg-table-max-height` normally and
		 * `--dg-virtual-height` when the body is virtualized (where the container needs a
		 * definite height rather than a cap). Both are what `layout.maxHeight` falls back to,
		 * so both sit under its name — a `layout.virtualHeight` key would be a default for an
		 * option that does not exist.
		 */
		maxHeight: {
			/** `--dg-table-max-height` when the body scrolls under a capped height. */
			default: '400px',
			/** `--dg-virtual-height` when the body is virtualized. */
			virtualized: '600px',
		},
	},
	/**
	 * Cell-type config floors, keyed by the option path they default: a `link` column writes
	 * `cell: { type: 'link', config: { target } }`, so the floor under it is
	 * `cell.config.target` — the path the docs' defaults table already prints.
	 */
	cell: {
		config: {
			/** A grid links inside its own app far more often than out of it. */
			target: LinkTarget.Self,
		},
	},
	/** Text direction the grid is laid out in. */
	direction: GridDirection.Ltr,
} as const
