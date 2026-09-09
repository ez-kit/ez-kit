/**
 * Every user-facing string the grid can render, in one place.
 *
 * The rule this type exists to enforce: **no string literal survives in a component.** A grid
 * that hardcodes "Rows per page" in a kit and "Select row" in an `aria-label` cannot be shipped
 * in a non-English app at all — not even partially, since the screen-reader text would stay in
 * another language than the UI around it. Everything renderable is a key here, the English
 * dictionary is the default, and a consumer replaces any subset of it through `messages`.
 *
 * The dictionary is **nested by feature**, the same way the config is: `messages.pagination.*`
 * holds what `pagination` renders, `messages.filtering.*` what `filtering` renders. Flat dotted
 * keys (`'pagination.rowsPerPage'`) would spell the feature a second way and lose the per-group
 * autocomplete that makes the object navigable.
 *
 * Static entries are plain strings. Entries whose text depends on the render take a **typed
 * context object** and return a string — a single object argument, never positional parameters,
 * so a later addition to the context is not a breaking change to every override.
 *
 * Deliberately **not** an i18n framework: no interpolation syntax, no plural rules, no locale
 * negotiation. Each entry is either a constant or a function the consumer writes, which is the
 * whole surface an `Intl.PluralRules` call or an ICU message needs to plug in behind.
 */
export type GridMessages = {
	/** The grid shell itself. */
	grid: {
		/** Accessible name of the table element. */
		label: string
	}
	/** Row selection: the checkboxes and the selection bar. */
	selection: {
		/** Accessible name of a row's selection checkbox. */
		selectRow: string
		/** Accessible name of the header's select-all checkbox. */
		selectAll: string
		/** Accessible name of the selection bar's dismiss button. */
		clear: string
		/** How the selection bar reports how many rows are selected. */
		count: (ctx: CountContext) => string
	}
	/** Row expansion. */
	expanding: {
		/** Accessible name of a collapsed row's toggle. */
		expand: string
		/** Accessible name of an expanded row's toggle. */
		collapse: string
	}
	/** Column resizing. */
	resizing: {
		/** Accessible name of a column's resize handle. */
		resize: string
	}
	/** The per-column header menu. */
	columnMenu: {
		/** Accessible name of the header's menu trigger. */
		trigger: string
		/** Heading of the sorting section. */
		sorting: string
		/** Sort ascending entry. */
		sortAsc: string
		/** Sort descending entry. */
		sortDesc: string
		/** Remove this column's sort. */
		clearSort: string
		/** Heading of the pinning section. */
		pin: string
		/** Pin to the leading edge. */
		pinLeft: string
		/** Pin to the trailing edge. */
		pinRight: string
		/** Unpin the column. */
		unpin: string
		/** Hide the column. */
		hide: string
	}
	/** Built-in row actions. Custom actions carry their own `label`. */
	rowActions: {
		/** Accessible name of the row's action menu. */
		menu: string
		/** Accessible name of the menu when it holds only the pinning entries. */
		pinning: string
		edit: string
		delete: string
		pinTop: string
		pinBottom: string
		unpin: string
	}
	/** The toolbar sort menu — the multi-sort editor, not the column header's. */
	sorting: {
		/** Accessible name of the toolbar's sort trigger. */
		menu: string
		/** Accessible name of one entry's direction control. */
		direction: string
		/** Accessible name of one entry's remove button. */
		remove: string
		/** Shown when no column is sorted yet. */
		empty: string
		/** Prefix of the first sort row. */
		sortBy: string
		/** Prefix of every sort row after the first. */
		thenBy: string
		/** The button that appends a sort. */
		add: string
	}
	/** The toolbar column-visibility menu. */
	visibility: {
		/** Accessible name of the toolbar's visibility trigger. */
		menu: string
	}
	/** Per-column filtering. */
	filtering: {
		/** Accessible name of a header's filter trigger. */
		trigger: string
		/** Placeholder of a column's text filter input. */
		placeholder: (ctx: FilterPlaceholderContext) => string
		/** Accessible name of the operator select. */
		operator: string
		/** What a filter chip reads when the column carries no value yet. */
		any: string
		/** Clear this column's filter. */
		clear: string
		/** Clear every filter at once — the toolbar button. */
		clearAll: string
		/** Lower bound of a range filter: placeholder and accessible name. */
		from: string
		/** Upper bound of a range filter: placeholder and accessible name. */
		to: string
		/** Accessible name of a range filter as a whole. */
		range: string
		/** Accessible name of a date-range filter. */
		dateRange: string
		/** Placeholder of the search box inside a multi-select filter. */
		search: string
		/** Shown when a multi-select filter's search matches nothing. */
		noResults: string
	}
	/** The global search box. */
	globalFiltering: {
		/** Placeholder of the search input, and the default of `globalFiltering.placeholder`. */
		placeholder: string
		/** How the active-filter chip names the global search. */
		label: string
	}
	/** Pagination controls and the page label. */
	pagination: {
		/** The word before the page number in the `'page'` label — `Page 2 of 5`. */
		page: string
		/** The word between the count and the total in both labels — `1–10 of 50`. */
		of: string
		/** Label beside the page-size selector. */
		rowsPerPage: string
		/** Jump to the first page. */
		first: string
		/** Jump to the last page. */
		last: string
		/** Previous page. */
		previous: string
		/** Next page. */
		next: string
	}
	/** The editing form. */
	editing: {
		/** Default dialog title. */
		title: string
		/** Commit button. */
		save: string
		/** Dismiss button. */
		cancel: string
	}
	/** The creating form. */
	creating: {
		/** Default dialog title. */
		title: string
		/** Commit button. */
		save: string
		/** Dismiss button. */
		cancel: string
	}
	/** The delete confirmation. */
	deleting: {
		/** Confirm button. */
		confirm: string
		/** Dismiss button. */
		cancel: string
	}
	/** The deferred-apply (draft) bar. */
	draft: {
		/** How the bar names the pending state. */
		label: string
		/** Accessible name of the pending-changes control. */
		pending: string
		/** Commits the pending query. */
		apply: string
		/** Discards it. */
		reset: string
		/**
		 * The pending-sorts segment — `2 sorts`. A function, because the plural rule is the
		 * language's, not the grid's: an override reaches for `Intl.PluralRules` here.
		 */
		sorts: (ctx: CountContext) => string
		/** The pending-filters segment — `2 filters`. */
		filters: (ctx: CountContext) => string
		/** The pending-search segment. Never counted — there is only ever one search. */
		search: string
	}
	/** Values and pickers a cell type renders, in any of its slots. */
	cells: {
		/** The "no value chosen" entry of a select filter. */
		all: string
		/** A boolean cell's true value. */
		yes: string
		/** A boolean cell's false value. */
		no: string
		/** An empty date picker's trigger text. */
		pickDate: string
		/** An empty date-range picker's trigger text. */
		pickRange: string
	}
	/** Loading / empty / no-results states and the infinite-scroll row. */
	fallbacks: {
		/** Accessible name of the loading state. */
		loading: string
		/** Title of the empty state — no rows at all. */
		empty: string
		/** Title of the no-results state — rows exist, filters match none. */
		noResults: string
		/** Accessible name of the background-refetch overlay. */
		refreshing: string
		/** The manual "load more" trigger. */
		loadMore: string
		/** Accessible name of the load-more spinner. */
		loadingMore: string
		/** Shown when loading the next page failed. */
		loadMoreError: string
	}
}

/** What an entry that reports a quantity is given. */
export type CountContext = {
	/** How many of the thing there are. Always ≥ 1 — a zero segment is not rendered. */
	count: number
}

/** What {@link GridMessages.filtering.placeholder} is given. */
export type FilterPlaceholderContext = {
	/** The column's id — its `accessorKey` unless an explicit `id` was set. */
	columnId: string
}

/**
 * A partial dictionary: any subset of {@link GridMessages}, group by group.
 *
 * Two levels deep is the whole shape, so this is spelled out rather than reached for with a
 * recursive `DeepPartial`, which would also make every leaf function optional-and-partial and
 * hide a typo inside a group.
 */
export type PartialGridMessages = {
	[K in keyof GridMessages]?: Partial<GridMessages[K]>
}
