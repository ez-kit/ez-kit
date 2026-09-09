import type { GridMessages } from './types'

/**
 * The English dictionary — the only place in the packages where a user-facing string is written.
 *
 * Shipped as the default rather than left for the consumer to supply, because a mandatory
 * dictionary would mean `<DataGrid data columns />` renders blank buttons and loses every
 * `aria-label` it has: the grid would be inaccessible until someone typed out sixty strings.
 * English is the fallback, `messages` is the replacement.
 *
 * No other locales ship with the package while the key set is still moving — a bundled `ru` or
 * `de` would have to be corrected in lockstep with every key added here, and a half-translated
 * dictionary is worse than an English one, because the gaps are invisible until they render.
 */
export const defaultMessages: GridMessages = {
	grid: {
		label: 'Data grid',
	},
	selection: {
		selectRow: 'Select row',
		selectAll: 'Select all rows',
		clear: 'Clear selection',
		count: ({ count }) => `${String(count)} selected`,
	},
	expanding: {
		expand: 'Expand row',
		collapse: 'Collapse row',
	},
	resizing: {
		resize: 'Resize column',
	},
	columnMenu: {
		trigger: 'Column options',
		sorting: 'Sorting',
		sortAsc: 'Asc',
		sortDesc: 'Desc',
		clearSort: 'Clear sort',
		pin: 'Pin',
		pinLeft: 'Pin Left',
		pinRight: 'Pin Right',
		unpin: 'Unpin',
		hide: 'Hide',
	},
	rowActions: {
		menu: 'Row actions',
		pinning: 'Row pinning',
		edit: 'Edit',
		delete: 'Delete',
		pinTop: 'Pin Top',
		pinBottom: 'Pin Bottom',
		unpin: 'Unpin',
	},
	sorting: {
		menu: 'Sort column',
		direction: 'Sort direction',
		remove: 'Remove sort',
		empty: 'No sorts applied. Add one to start sorting.',
		sortBy: 'sort by',
		thenBy: 'then by',
		add: 'Add Sort',
	},
	visibility: {
		menu: 'Column visibility',
	},
	filtering: {
		trigger: 'Filter',
		placeholder: ({ columnId }) => `Filter ${columnId}…`,
		operator: 'Filter operator',
		any: 'Any',
		clear: 'Clear',
		clearAll: 'Clear filters',
		from: 'From',
		to: 'To',
		range: 'Range',
		dateRange: 'Date range',
		search: 'Search…',
		noResults: 'No results',
	},
	globalFiltering: {
		placeholder: 'Search…',
		label: 'Search',
	},
	pagination: {
		page: 'Page',
		of: 'of',
		rowsPerPage: 'Rows per page',
		first: 'Go to first page',
		last: 'Go to last page',
		previous: 'Previous',
		next: 'Next',
	},
	editing: {
		title: 'Edit',
		save: 'Save',
		cancel: 'Cancel',
	},
	creating: {
		title: 'Create',
		save: 'Save',
		cancel: 'Cancel',
	},
	deleting: {
		confirm: 'Delete',
		cancel: 'Cancel',
	},
	draft: {
		label: 'Unapplied',
		pending: 'Pending changes',
		apply: 'Apply',
		reset: 'Reset',
		sorts: ({ count }) => `${String(count)} ${count === 1 ? 'sort' : 'sorts'}`,
		filters: ({ count }) => `${String(count)} ${count === 1 ? 'filter' : 'filters'}`,
		search: 'search',
	},
	cells: {
		all: 'All',
		yes: 'Yes',
		no: 'No',
		pickDate: 'Pick a date',
		pickRange: 'Pick a range',
	},
	fallbacks: {
		loading: 'Loading',
		empty: 'No data',
		noResults: 'No results',
		refreshing: 'Refreshing',
		loadMore: 'Load more',
		loadingMore: 'Loading more',
		loadMoreError: 'Couldn’t load more.',
	},
}
