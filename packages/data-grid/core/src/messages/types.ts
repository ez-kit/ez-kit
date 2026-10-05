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
		/**
		 * How the grid's live region reports the size of the current result set, announced when
		 * a filter or a search term changes it. Never rendered visibly.
		 */
		rowCount: (ctx: CountContext) => string
	}
	/** Row selection: the checkboxes and the selection bar. */
	selection: {
		/** The selection bar's built-in bulk-delete action. */
		delete: string
		/** Accessible name of a row's selection checkbox. */
		selectRow: string
		/** Accessible name of the header's select-all checkbox. */
		selectAll: string
		/** Accessible name of the selection bar's dismiss button. */
		clear: string
		/** How the selection bar reports how many rows are selected. */
		count: (ctx: CountContext) => string
		/**
		 * Accessible name of the selection column's header cell.
		 *
		 * Rendered visually hidden, and only when the cell would otherwise be empty — under
		 * `selection.multi: false` there is no select-all checkbox to name it, and a `<th>` with
		 * no accessible name is what axe reports as `empty-table-header`.
		 */
		columnHeader: string
	}
	/** Row expansion. */
	expanding: {
		/** Accessible name of a collapsed row's toggle. */
		expand: string
		/** Accessible name of an expanded row's toggle. */
		collapse: string
		/**
		 * Accessible name of the expand column's header cell, rendered visually hidden.
		 *
		 * The column carries chevrons and no heading, so the `<th>` has no text of its own —
		 * see {@link GridMessages.selection.columnHeader}.
		 */
		columnHeader: string
	}
	/** Row grouping — the group rows themselves, not the bar that lists the levels. */
	grouping: {
		/** How a group row reports how many rows it holds. */
		count: (ctx: CountContext) => string
		/**
		 * The label a group row carries when its grouping value is `null`, `undefined` or `''`.
		 *
		 * Such rows are grouped rather than dropped — the absence of a value is itself something
		 * a reader is looking for — so the group needs a name, and an empty cell beside a count
		 * reads as a rendering bug.
		 */
		blank: string
		/**
		 * Accessible name of the group column's header cell, rendered visually hidden.
		 *
		 * The column's heading changes with the levels, so the `<th>` has no fixed text — see
		 * {@link GridMessages.expanding.columnHeader}.
		 */
		columnHeader: string
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
		/**
		 * Pin to the start edge.
		 *
		 * The key is logical, like `moveStart` below and for the same reason — the edge flips
		 * under RTL, so "start" is what the action means whichever way the page runs. The
		 * English default is the LTR wording a reader expects; an RTL locale writes its own
		 * words for the same key.
		 */
		pinStart: string
		/** Pin to the end edge. Logical, like `pinStart`. */
		pinEnd: string
		/** Unpin the column. */
		unpin: string
		/** Hide the column. */
		hide: string
		/** Heading of the reordering section. */
		order: string
		/**
		 * Move one step toward the start of the order.
		 *
		 * The key is logical — the order flips under RTL, so "start" is what the action means
		 * whichever way the page runs. The English default is the LTR wording a reader expects;
		 * an RTL locale writes its own words for the same key.
		 */
		moveStart: string
		/** Move one step toward the end of the order. */
		moveEnd: string
		/** Heading of the grouping section. */
		grouping: string
		/** Add this column as a grouping level. */
		groupBy: string
		/** Drop this column as a grouping level. */
		ungroup: string
	}
	/** The bar that lists the active grouping levels — `<DataGrid.GroupByBar />`. */
	groupBar: {
		/** Accessible name of the bar itself. */
		label: string
		/** Remove one level. */
		remove: string
		/**
		 * Make this level nest one step further out.
		 *
		 * Neither logical nor physical, because nesting depth is neither: it is not a screen
		 * axis, so nothing about it flips under RTL and nothing about it runs up or down. So
		 * none of the `moveStart` / `moveUp` reasoning applies — the key names the thing that
		 * actually changes, which is how deep the level sits.
		 */
		moveOuter: string
		/** Make this level nest one step further in. */
		moveInner: string
		/** Accessible name of the picker that adds a level. */
		add: string
	}
	/** Built-in row actions. Custom actions carry their own `label`. */
	rowActions: {
		/**
		 * Accessible name of the row-actions column's header cell, rendered visually hidden.
		 *
		 * Distinct from {@link GridMessages.rowActions.menu}, which names one row's trigger:
		 * this names the column. See {@link GridMessages.selection.columnHeader}.
		 */
		columnHeader: string
		/** Accessible name of the row's action menu. */
		menu: string
		/** Accessible name of the menu when it holds only the pinning entries. */
		pinning: string
		edit: string
		delete: string
		pinTop: string
		pinBottom: string
		unpin: string
		/** Heading of the reordering section. */
		order: string
		/**
		 * Accessible name of the overflow trigger when the menu holds only the move entries.
		 *
		 * The trigger is named for what is inside it: `menu` once an application contributed
		 * entries or more than one built-in group is present, `pinning` for a pin-only menu,
		 * this for an order-only one.
		 */
		ordering: string
		/**
		 * Move one row up.
		 *
		 * Physical, unlike the column menu's logical `moveStart` / `moveEnd`: the vertical axis
		 * does not flip under RTL, so "up" means the same thing whichever way the page runs.
		 */
		moveUp: string
		/** Move one row down. */
		moveDown: string
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
		/** Label of the toolbar's sort trigger. */
		trigger: string
		/** Ascending direction. */
		ascending: string
		/** Descending direction. */
		descending: string
		/** Clears every sort at once. */
		reset: string
		/** Prefix of the first sort row. */
		sortBy: string
		/** Prefix of every sort row after the first. */
		thenBy: string
		/** The button that appends a sort. */
		add: string
	}
	/** The toolbar column-visibility menu. */
	/**
	 * Reordering, as a **drag** rather than a step.
	 *
	 * A group of its own because reordering had no user-visible string until now: the one-step
	 * affordances borrow the vocabulary of where they live — `columnMenu.moveStart` in the header
	 * menu, `visibility.moveStart` in the column panel. A drag handle belongs to neither.
	 *
	 * This group is where the drag's remaining strings land as the surfaces arrive — the live-region
	 * announcements and the handle's ARIA description among them. It is deliberately started here,
	 * with the one key a rendered control cannot go without: an icon-only button needs an accessible
	 * name from its first frame, not from the release that completes the feature.
	 *
	 * **The announcement keys below are a sentence each, not a stem plus a value.** A sentence
	 * assembled from fragments cannot be translated: word order differs between languages, and a
	 * locale that puts the position before the verb has nowhere to say so if the verb arrives as one
	 * key and the position as another. So every key here returns a whole sentence from a named
	 * context, which is also why the row and the column forms are **separate keys** rather than one
	 * key taking a name the grid built — "row 3" is itself a phrase, and building it above the
	 * catalogue would put an English fragment back in the sentence.
	 *
	 * These replace the English the drag library announces on its own. Left unconfigured,
	 * `@dnd-kit/dom`'s `Accessibility` plugin writes its own sentences into a live region it creates
	 * — in English whatever the app's locale, and naming the record id rather than the column or the
	 * position, because its callbacks receive only the two ids.
	 */
	ordering: {
		/** Accessible name of a row's drag handle. */
		dragRow: string
		/** Accessible name of a column header's drag handle. Same standing as {@link dragRow}. */
		dragColumn: string
		/**
		 * What a screen reader calls a drag handle — the `aria-roledescription` of the element,
		 * which replaces the role a user would otherwise hear ("button").
		 *
		 * One word or a very short noun phrase, never a sentence: it is read in place of the role,
		 * after the accessible name, so "Reorder row, draggable" is what a user hears.
		 */
		draggable: string
		/**
		 * How to drive a drag from the keyboard, read once when a handle takes focus.
		 *
		 * Rendered into a hidden element the handle points `aria-describedby` at, so it is
		 * announced after the name and the role description and never seen. It names keys, which is
		 * why it is a constant rather than a function: nothing about the grid's state changes it.
		 *
		 * **This is the one key in this group that is not live, and the limit is the drag library's.**
		 * `@dnd-kit/dom@0.1.21`'s `Accessibility` plugin builds its hidden text node from the string
		 * captured in its constructor and recreates the node only once it has been disconnected from
		 * the document — and the plugin registry reuses one instance per constructor rather than
		 * constructing a second. So a dictionary swapped at runtime reaches the nine announcement
		 * sentences below and **does not** reach this one: the mounted grid keeps the instructions it
		 * was first given. Remounting the grid picks up the new text. Stated here rather than left to
		 * be discovered, because every other key in this group behaves the other way.
		 */
		instructions: string
		/** Announced when a row is picked up. */
		rowPickedUp: (ctx: OrderingPositionContext) => string
		/** Announced when a held row reaches a new position. */
		rowMovedTo: (ctx: OrderingPositionContext) => string
		/** Announced when a row is dropped. */
		rowDropped: (ctx: OrderingPositionContext) => string
		/**
		 * Announced when a row drag is cancelled.
		 *
		 * The position is where the row is, which after a cancellation is where it started: nothing
		 * was committed, so the grid's own state never moved.
		 */
		rowCancelled: (ctx: OrderingPositionContext) => string
		/** Announced when a column is picked up. */
		columnPickedUp: (ctx: OrderingColumnContext) => string
		/** Announced when a held column reaches a new position. */
		columnMovedTo: (ctx: OrderingColumnContext) => string
		/** Announced when a column is dropped. */
		columnDropped: (ctx: OrderingColumnContext) => string
		/** Announced when a column drag is cancelled — see {@link rowCancelled} on the position. */
		columnCancelled: (ctx: OrderingColumnContext) => string
	}
	visibility: {
		/** Accessible name of the toolbar's visibility trigger. */
		menu: string
		/** Label of that trigger. */
		trigger: string
		/**
		 * Accessible name of the control that moves a column one step toward the start of the
		 * order, offered when `ordering.column.visibilityMenu` turns this menu into a column
		 * panel.
		 *
		 * The key is logical and the wording is not, exactly like `columnMenu.moveStart`: the
		 * order flips under RTL, so "start" is what the action means, while what it reads
		 * belongs to the surface — a vertical list, where the start of the order is the top.
		 */
		moveStart: string
		/** Accessible name of the control that moves a column one step toward the end. */
		moveEnd: string
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
		/** Accessible name of the date-range preset menu, and its trigger while none is active. */
		presets: string
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
		/** Accessible name of the pagination landmark itself. */
		navigation: string
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
	}
	/** The creating form. */
	creating: {
		/** Default dialog title. */
		title: string
		/** Default label of the button that opens the form — `<DataGrid.CreateTrigger>`. */
		trigger: string
	}
	/**
	 * The form chrome shared by editing and creating. Its two buttons say the same thing in
	 * both flows — only the title differs, which is why that is what each feature keeps — and
	 * the shell that renders them does not know which flow opened it.
	 */
	form: {
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
		/** Default prompt title. `deleting.confirmation.title` overrides it per grid. */
		title: string
		/** Default prompt body, and the tail of the bulk one. */
		description: string
		/** Default prompt title when a selection is being deleted. */
		bulkTitle: string
		/** Default bulk prompt body — `Delete 3 rows? …`. */
		bulkDescription: (ctx: CountContext) => string
	}
	/** The deferred-apply (draft) bar. */
	draft: {
		/** How the bar names the pending state. */
		label: string
		/**
		 * Generic accessible name for the pending-changes section, used when there is nothing to
		 * enumerate — {@link GridMessages.draft.summary} names the axes whenever any are pending.
		 */
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
		/**
		 * The long form: one phrase naming everything that is pending, for the bar's accessible
		 * name and its tooltip. The bar itself shows a glyph and a number per axis, which is
		 * short enough to sit beside a live selection but says nothing on its own.
		 *
		 * A function, and given the segments rather than the counts, for the same reason
		 * {@link GridMessages.draft.sorts} is one: the separators are the language's — a locale
		 * that does not join a list with `, ` has nowhere else to say so — and building the
		 * phrase from the segments means an override of `sorts` alone reaches the long form too.
		 */
		summary: (ctx: DraftSummaryContext) => string
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
	/**
	 * Filter-operator labels, grouped the way the built-in operator sets are.
	 *
	 * The same id means the same comparison whatever the column's cell type is — only the
	 * wording changes, which is exactly what these groups hold: `greaterThan` reads "Greater
	 * than" on a number column and "After" on a date one. A custom operator registered through
	 * `filtering.operators.items` carries its own `label` and is not looked up here.
	 */
	operators: {
		/** Text columns, and the `image` / `link` types that filter as text. */
		text: Record<'contains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith', string>
		/** Number columns, and `progress`. */
		number: Record<
			'equals' | 'notEquals' | 'greaterThan' | 'greaterOrEqual' | 'lessThan' | 'lessOrEqual' | 'between',
			string
		>
		/** Date columns — the same comparisons as `number`, spoken as a calendar. */
		date: Record<
			'equals' | 'notEquals' | 'greaterThan' | 'greaterOrEqual' | 'lessThan' | 'lessOrEqual' | 'between',
			string
		>
		/** Boolean columns. Equality only — a boolean has no ordering. */
		boolean: Record<'equals' | 'notEquals', string>
		/** `select` / `badge` columns, which filter by set membership. */
		multi: Record<'in' | 'notIn', string>
		/** The emptiness pair, shared by every cell type's default set. */
		empty: Record<'isEmpty' | 'isNotEmpty', string>
		/**
		 * The date presets offered beside a date filter. The first six are ranges, for `between`;
		 * the last three are single dates, for the operators that take one (`equals`, `lessThan`,
		 * `greaterThan`, …). `today` and `yesterday` serve both — a one-day range and the day itself.
		 */
		presets: Record<
			'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'weekAgo' | 'monthAgo' | 'startOfMonth',
			string
		>
	}
	/** Loading / empty / no-results states and the infinite-scroll row. */
	fallbacks: {
		/** Accessible name of the loading state. */
		loading: string
		/** Retries a failed page load. */
		retry: string
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

/**
 * What a row-ordering announcement is given.
 *
 * `position` is **1-based**, because it is read aloud: a user hears "row 3 of 20", never "row 2 of
 * 20" for the third row. Everything inside the drag counts from zero; the conversion happens once,
 * where the sentence is built.
 *
 * Both numbers describe **the rows the body renders**, which is what the drag moved among and what
 * the user is looking at — not the row model. The two differ wherever the grid is doing something:
 * under pagination they are the current page, under a filter the survivors, and in a **virtualized**
 * body they are the rendered window, so a 10 000-row grid announces a position within the few dozen
 * rows on screen. That last one is a real limit rather than a rounding: the window is the only list
 * the drag's own index space agrees with, and announcing a model position instead would name a place
 * the drag was never counting in.
 */
export type OrderingPositionContext = {
	/** Where the row is, counted from one, among the rows the body renders. */
	position: number
	/** How many rows the body renders. */
	total: number
}

/**
 * What a column-ordering announcement is given — {@link OrderingPositionContext} plus the name.
 *
 * A column has a heading and so can be called something; a row has only its place. Hence two
 * context types and two sets of keys rather than one set taking a name the grid had to invent.
 */
export type OrderingColumnContext = {
	/**
	 * The column's heading when it is text, and its id when the heading is an element.
	 *
	 * Never a rendered element flattened to text: a header may be arbitrary JSX, and turning one
	 * into a string means rendering it out of tree. The id is a worse name and an honest one.
	 */
	name: string
	/** Where the column is, counted from one, among the columns its surface lists. */
	position: number
	/** How many columns that surface lists — the visible leaves in the header, every leaf in the panel. */
	total: number
}

/** What {@link GridMessages.draft.summary} is given. */
export type DraftSummaryContext = {
	/** The bar's own short label — `draft.label`, passed through so an override of it carries. */
	label: string
	/**
	 * The pending axes, already worded by `sorts` / `filters` / `search`, in the order a user
	 * reads their query. Never empty: no axis pending means no draft section to name.
	 */
	parts: string[]
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
