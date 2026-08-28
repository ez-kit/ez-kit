import type { GridMenuProps } from './menu'
import type {
	BetweenInputType,
	BetweenInputVariant,
	BetweenValue,
	ColumnPinSide,
	DateRangePreset,
	FilterOperatorDef,
	LoadMoreDirection,
	FilterItem,
} from '@ez-kit/data-grid-core'
import type { Row } from '@tanstack/table-core'
import type {
	ButtonHTMLAttributes,
	ComponentType,
	HTMLAttributes,
	InputHTMLAttributes,
	KeyboardEventHandler,
	MouseEventHandler,
	ReactElement,
	ReactNode,
	RefAttributes,
	TdHTMLAttributes,
	ThHTMLAttributes,
	TouchEventHandler,
} from 'react'

/** Which affordances the row-actions cell offers, and therefore which props it carries. */
export const ActionsCellState = {
	/** A settled row: edit / delete. */
	Idle: 'idle',
	/** A row being edited inline: save / cancel. */
	Editing: 'editing',
	/** The creating row: save, plus cancel unless it is the pinned creating row. */
	Creating: 'creating',
} as const

export type ActionsCellState = (typeof ActionsCellState)[keyof typeof ActionsCellState]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionsCellIdleProps<TRow extends object = any> = {
	state: typeof ActionsCellState.Idle
	row: Row<TRow>
	hasEditing: boolean
	hasDeleting: boolean
	onEdit: () => void
	onDelete: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionsCellEditingProps<TRow extends object = any> = {
	state: typeof ActionsCellState.Editing
	row: Row<TRow>
	onSave: () => Promise<void>
	onCancel: () => void
	/** True while the commit is in flight (`commitStatus !== 'idle'`). */
	isPending: boolean
}

type ActionsCellCreatingProps = {
	state: typeof ActionsCellState.Creating
	onSave: () => Promise<void>
	onCancel: () => void
	/** `false` on the pinned creating row, which has nothing to cancel back to. */
	canCancel: boolean
	isPending: boolean
}

/**
 * The row-actions cell, in all three states a row can be in.
 *
 * A discriminated union rather than a bag of optional flags: each mode carries exactly the
 * callbacks it can use, so a kit cannot render Save for a settled row or Delete mid-create.
 * `Editing` and `Creating` used to be two separate injectable components whose bodies were
 * the same save/cancel pair.
 */
/**
 * `TRow` is a caller-supplied parameter, not something the registry can infer: the DI map holds
 * one `ActionsCell` for grids of every row type. A kit that only ever renders one row shape
 * writes `ActionsCellProps<Invoice>` and gets a typed `row.original`; omitting it keeps the
 * unchecked default, and `any` stays mutually assignable so the registry accepts both.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionsCellProps<TRow extends object = any> =
	| ActionsCellIdleProps<TRow>
	| ActionsCellEditingProps<TRow>
	| ActionsCellCreatingProps

// ── primitive component props ─────────────────────────────────────────────

export type TableProps = HTMLAttributes<HTMLTableElement>
/**
 * The thead adapter must forward `ref` to the rendered element: the shared layer measures the
 * header there to publish `--dg-header-height` (see `Header`), and a kit that swallows the ref
 * leaves pinned-top rows stacked under the sticky header.
 */
export type TheadProps = HTMLAttributes<HTMLTableSectionElement> & RefAttributes<HTMLTableSectionElement>
export type TbodyProps = HTMLAttributes<HTMLTableSectionElement>
/** Table footer section. Same shape as {@link TbodyProps} — no ref, nothing is measured there. */
export type TfootProps = HTMLAttributes<HTMLTableSectionElement>
/** Like {@link TheadProps}, the ref must reach the rendered row: pinned rows are measured there. */
export type TrProps = HTMLAttributes<HTMLTableRowElement> & RefAttributes<HTMLTableRowElement>
/** `pinned` is the core `ColumnPinSide`, widened with `false` for the unpinned majority. */
export type ThProps = ThHTMLAttributes<HTMLTableCellElement> & { pinned?: ColumnPinSide | false }
export type TdProps = TdHTMLAttributes<HTMLTableCellElement> & { pinned?: ColumnPinSide | false }
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
export type InputProps = InputHTMLAttributes<HTMLInputElement>

export type CheckboxProps = {
	value?: boolean | undefined
	indeterminate?: boolean
	disabled?: boolean
	onChange?: (checked: boolean) => void
	'aria-label'?: string
}

export type NumberInputProps = {
	value?: number | undefined
	onChange?: (value: number | undefined) => void
	onBlur?: () => void
}

export type ModalProps = {
	open: boolean
	onClose: () => void
	title?: string
	children?: ReactNode
	onSave?: () => void
	onCancel?: () => void
}

export type ToolbarProps = {
	children?: ReactNode
	left?: ReactNode
	right?: ReactNode
}

/**
 * Props for the UI-kit Global Filter input (search field).
 * - `value` / `onChange` are wired by the headless wrapper to the table's
 *   `state.globalFilter`. When the user types, the wrapper applies the optional
 *   debounce before calling `onChange`.
 * - `placeholder` is forwarded from `globalFiltering.placeholder`.
 * - `debounce` is informational — the wrapper has already applied debounce; the
 *   UI-kit input does not need to debounce again. Exposed so kits can show
 *   pending state if desired.
 * - `onKeyDown`, when present, must be forwarded to the underlying `<input>` verbatim —
 *   the headless wrapper uses it to apply the whole pending draft on Enter under
 *   `deferredApply`. `undefined` when there is nothing to wire (e.g. `deferredApply` off).
 */
export type GlobalFilterInputProps = {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	debounce?: number
	onKeyDown?: KeyboardEventHandler<HTMLInputElement>
}

/**
 * Named members of {@link PaginationVariant}. A convenience handle — the option and every prop
 * are typed as the string union, so `variant: 'simple'` is equally valid and needs no import.
 * Internal code (defaults, label builder, kits) references the members instead of repeating
 * the literals.
 *
 * A const object rather than an `enum` on purpose: enum members are a nominal type, so code
 * holding the public union could not be compared against them
 * (`@typescript-eslint/no-unsafe-enum-comparison`).
 */
export const PaginationVariant = {
	/** Prev/next plus a link per page. The default. */
	Numbered: 'numbered',
	/** Prev/next plus an "X–Y of N" range label; no page links. */
	Simple: 'simple',
	/** Prev/next plus a "Page X of Y" label; no page links. */
	Compact: 'compact',
} as const

/**
 * Presentation of the page-based pagination footer. A pure display concern —
 * the page-based logic is identical across variants, only the controls differ.
 *
 * Derived from {@link PaginationVariant} so the union and the members cannot drift apart.
 */
export type PaginationVariant = (typeof PaginationVariant)[keyof typeof PaginationVariant]

export type PaginationProps = {
	pageIndex: number
	/**
	 * Total number of pages. `undefined` when unknown — a manually paginated grid given
	 * neither `rowCount` nor `pageCount` knows only which page it is on. Already
	 * normalized: the core `UNKNOWN_PAGE_COUNT` sentinel never reaches a UI kit.
	 */
	pageCount?: number
	/** Rows per page, from the table's pagination state. Drives the "X–Y of N" range label. */
	pageSize: number
	/**
	 * Total row count across all pages. `undefined` when unknown — i.e. a manually
	 * paginated grid where the consumer supplied no `pagination.rowCount`. Never inferred
	 * from the loaded page. Use to render an "X–Y of N" label.
	 */
	rowCount?: number
	/** Which set of controls to render. Resolved by the react layer; never undefined. */
	variant: PaginationVariant
	/**
	 * `numbered` only. Pages kept either side of the current one in the page-link strip.
	 * Resolved by the react layer; never undefined. Feed it to `buildPageWindow` rather than
	 * looping over `pageCount` — see {@link https://github.com/ez-kit/ez-kit/issues/106}.
	 */
	siblings: number
	/** `numbered` only. Pages kept at each end of the page-link strip. Never undefined. */
	boundaries: number
	canPreviousPage: boolean
	canNextPage: boolean
	onPreviousPage: () => void
	onNextPage: () => void
	onFirstPage: () => void
	onLastPage: () => void
	onPageChange: (pageIndex: number) => void
}

export type PageSizerProps = {
	pageSize: number
	items: number[]
	onPageSizeChange: (size: number) => void
}

export type ResizerProps = {
	onMouseDown: MouseEventHandler<HTMLDivElement>
	onTouchStart: TouchEventHandler<HTMLDivElement>
	onDoubleClick: MouseEventHandler<HTMLDivElement>
	/** True while the user is actively dragging this column border. */
	isResizing: boolean
}

/**
 * Closed set of per-row actions the grid can offer. A kit maps each id to its own
 * icon and wording — the shared layer only decides which ids are available.
 */
export const RowActionId = {
	Edit: 'edit',
	Delete: 'delete',
	PinTop: 'pin-top',
	PinBottom: 'pin-bottom',
	Unpin: 'unpin',
} as const

export type RowActionId = (typeof RowActionId)[keyof typeof RowActionId]

export type SortIndicatorProps = {
	/**
	 * The column's active direction, or {@link ColumnSortDirection.None}. Same type and same
	 * field name as `<DataGrid.HeaderCell>`'s render args, so a kit that renders both against
	 * one helper does not have to translate between them.
	 */
	sortDirection: ColumnSortDirection
	canSort: boolean
}

export type VisibilityColumnItem = {
	id: string
	label: string
	isVisible: boolean
	onToggle: () => void
}

export type VisibilityMenuProps = {
	columns: VisibilityColumnItem[]
}

/**
 * Direction a column is sorted in.
 *
 * Named members for internal reference; the plain string union is what callers see, so
 * `direction === 'asc'` is equally valid and needs no import.
 */
export const SortDirection = {
	/** Ascending — A→Z, 0→9, oldest→newest. */
	Asc: 'asc',
	/** Descending — Z→A, 9→0, newest→oldest. */
	Desc: 'desc',
} as const

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection]

/**
 * How a column is sorted **right now** — the two directions plus an explicit
 * {@link ColumnSortDirection.None}, rather than `SortDirection | false`.
 *
 * A distinct set from {@link SortDirection} because it answers a distinct question:
 * `SortDirection` is a direction someone *picks* (the multi-sort builder's per-row select,
 * where "none" would mean nothing), this is a state the grid *reports*. Every public surface
 * that reports it — `<DataGrid.HeaderCell>`'s render args and the kit's `SortIndicator` —
 * uses this one type under the same field name, `sortDirection`. The `None` member rather
 * than `false` so it reads in JSX and lands in `data-sort-direction` as a word.
 */
export const ColumnSortDirection = {
	/** Ascending. Mirrors {@link SortDirection.Asc}. */
	Asc: SortDirection.Asc,
	/** Descending. Mirrors {@link SortDirection.Desc}. */
	Desc: SortDirection.Desc,
	/** The column carries no sort. */
	None: 'none',
} as const

export type ColumnSortDirection = (typeof ColumnSortDirection)[keyof typeof ColumnSortDirection]

export type SortColumnOption = {
	id: string
	label: string
}

export type SortMenuItem = {
	columnId: string
	direction: SortDirection
	/** Columns the user may pick for this row — already excludes columns used by other rows. */
	availableColumns: SortColumnOption[]
	onChangeColumn: (columnId: string) => void
	onChangeDirection: (direction: SortDirection) => void
	onRemove: () => void
}

export type SortMenuProps = {
	items: SortMenuItem[]
	canAddSort: boolean
	onAddSort: () => void
	onResetSorting: () => void
}

export type FilterPopoverProps = {
	children: ReactNode
	hasActiveFilter: boolean
}

export type FilterPanelProps = {
	/** Already-rendered list of per-column filter rows produced by `<DataGrid.FilterPanel />`. */
	children: ReactNode
	/** True when at least one column has an active filter. Kits may surface a count badge. */
	hasActiveFilter: boolean
}

export type FilterPanelChipProps = {
	/** Column header label (e.g. "Status", "Total"). */
	label: string
	/** Pre-rendered value display ("Open, Done", "100 – 500", or "Any" when no value). */
	valueDisplay: ReactNode
	/** True when the column has an active filter. Kits typically render an X clear control only when true. */
	hasValue: boolean
	/** Clear handler. Called when the user clicks the inline X. Adapter wires it to `column.setFilterValue(undefined)`. */
	onClear: () => void
	/** Popover content — the actual filter input produced by `renderFilterInput`. */
	children: ReactNode
}

/**
 * Which filter a chip in the active-filters strip stands for. Kits may style the two differently.
 *
 * Named members for internal reference; the plain string union is what callers see, so
 * `kind === 'global'` is equally valid and needs no import.
 */
export const FilterChipKind = {
	/** A per-column filter. */
	Column: 'column',
	/** The cross-column global search value. */
	Global: 'global',
} as const

export type FilterChipKind = (typeof FilterChipKind)[keyof typeof FilterChipKind]

export type FilterChipProps = {
	/** Human label for the chip — column header for `kind: 'column'`, "Search" for `kind: 'global'`. */
	label: string
	/** Pre-rendered display of the filter value (operator + value, between range, list, etc.). */
	value: ReactNode
	/** Remove this filter. Adapter wires it to `column.setFilterValue(undefined)` or `table.setGlobalFilter(undefined)`. */
	onRemove: () => void
	/** Where the filter comes from. Kits may style column vs. global chips differently. */
	kind: FilterChipKind
	/**
	 * True when this filter is part of the not-yet-applied draft under `deferredApply` — i.e.
	 * it differs from (or is absent from) `table.getState().applied`. Kits render this as
	 * `data-draft-filter=""` on the chip's root element.
	 */
	isDraft: boolean
}

export type ClearFiltersButtonComponentProps = {
	/** True when no filter is active; kit can render the button in a disabled state. */
	disabled: boolean
	/** Clear every column filter and the global filter. */
	onClick: () => void
	/** Optional custom contents. When absent the kit renders its default (icon-only). */
	children?: ReactNode
	/** Accessibility label. Defaults to "Clear filters" when omitted. */
	'aria-label'?: string
}

export type OperatorSelectProps = {
	operators: FilterOperatorDef[]
	currentOperatorId: string
	onChange: (operatorId: string) => void
}

export type BetweenInputProps = {
	value: BetweenValue
	onChange: (value: BetweenValue) => void
	variant: BetweenInputVariant
	type: BetweenInputType
	min?: number
	max?: number
	/** Preset list to render above the inputs/slider/calendar. Already resolved by the adapter. */
	presets?: DateRangePreset[]
	/** Called when the user clicks a preset chip. Adapter wires it to setFilterValue with the preset's range. */
	onPresetSelect?: (preset: DateRangePreset) => void
}

export type { DateRangePreset, FilterItem }

export type MultiSelectFilterProps = {
	/** The values on offer. Counts (when present) come from faceted unique values. */
	items: FilterItem[]
	/** Currently selected values. Empty array = no filter. */
	selectedValues: string[]
	/** Called with the next array of selected values. */
	onChange: (next: string[]) => void
	/** Optional trigger placeholder (e.g. "Filter status"). */
	placeholder?: string
}

export type ConfirmDialogProps = {
	open: boolean
	title: string
	description: string
	onConfirm: () => void
	onCancel: () => void
}

/**
 * Form shell — unified slot for `creating` / `editing` modal forms.
 * Owns the modal chrome, form-level error banner, action buttons, and pending state.
 * Body content (`children`) is the `<AutoForm>`-style field list rendered by the data-grid layer.
 */
export type FormShellProps = {
	open: boolean
	title: string
	formError: string | null
	/** True while validate or onSave is in flight (`commitStatus !== 'idle'`). */
	isPending: boolean
	onSave: () => Promise<void>
	onCancel: () => void
	children: ReactNode
}

export type LoadingRowProps = {
	columnCount: number
}

export type EmptyStateProps = {
	columnCount: number
}

export type NoResultsStateProps = {
	columnCount: number
}

/**
 * Props for the injectable refetch overlay. Rendered over existing rows when a
 * background refetch is in flight (`isFetching && !isPending && rows.length > 0`).
 * All visual styling (dim, spinner, backdrop) lives in the UI kit — the react package
 * only renders the structural host element with `data-slot="refetch-overlay"`.
 */
export type RefetchOverlayProps = {
	/** Number of visible leaf columns — available if the kit needs a full-width cell. */
	columnCount: number
}

/**
 * Props for the injectable infinite-scroll loader row. All visual styling lives in
 * the UI kit (`shadcn` / `heroui`); the react package only positions it inside a
 * full-width cell. The component should render:
 * - a spinner when `isFetching`
 * - a "Load more" button when `trigger` is {@link LoadMoreTrigger.Manual} and `hasMore` (calls `onTrigger`)
 * - a "Retry" affordance when `error` is non-null (calls `onRetry`)
 */
/**
 * How a column's filter control is presented.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `variant: 'popover'` is equally valid and needs no import.
 */
export const FilteringVariant = {
	/** The control sits in the header cell, under the column label. The default. */
	Inline: 'inline',
	/** The control opens from a per-column popover trigger in the header. */
	Popover: 'popover',
	/** Every column's control is collected into one filter panel. */
	Panel: 'panel',
} as const

export type FilteringVariant = (typeof FilteringVariant)[keyof typeof FilteringVariant]

/**
 * Where the auto-mounted active-filter chips strip renders relative to the table.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `position: 'below'` is equally valid and needs no import.
 */
export const FilterChipsPosition = {
	/** Between the toolbar and the table. The default. */
	Above: 'above',
	/** Under the table, before the pagination footer. */
	Below: 'below',
} as const

export type FilterChipsPosition = (typeof FilterChipsPosition)[keyof typeof FilterChipsPosition]

/**
 * What makes an infinite-scroll grid load the next page.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `trigger: 'manual'` is equally valid and needs no import.
 */
export const LoadMoreTrigger = {
	/** Load as soon as the edge enters view. The default. */
	Auto: 'auto',
	/** Suppress edge detection and render a "Load more" control instead. */
	Manual: 'manual',
} as const

export type LoadMoreTrigger = (typeof LoadMoreTrigger)[keyof typeof LoadMoreTrigger]

/**
 * How close to the load edge an infinite-scroll grid triggers the next page — a genuine
 * either/or, in the same shape (and for the same reason) as core's `PaginationTotals`.
 *
 * The two units address two different detection paths: `rows` is a row-index distance read by
 * the virtualized path, `px` is the `IntersectionObserver` `rootMargin` used when the body is
 * not virtualized. Only one of them is ever consulted for a given grid, so supplying both is a
 * setting that silently does nothing half the time. The `never` arms say so at the type level
 * rather than leaving it as a sentence in the docs.
 */
export type LoadMoreThreshold = { rows?: number; px?: never } | { px?: number; rows?: never }

export type LoadMoreRowProps = {
	/** Visible leaf column count — for the host `<td colSpan>`, if the kit needs it. */
	columnCount: number
	/** Load direction. v1 is always {@link LoadMoreDirection.Forward}. */
	direction: LoadMoreDirection
	/** A page request is in flight in this direction. */
	isFetching: boolean
	/** More rows can be loaded in this direction (controlled `hasNextPage`). */
	hasMore: boolean
	/** Last load error for this direction, or `null`. */
	error: unknown
	/** Active trigger mode. */
	trigger: LoadMoreTrigger
	/** Invoke a load (used by the manual "Load more" control). */
	onTrigger: () => void
	/** Re-invoke the failed load and clear the error. */
	onRetry: () => void
}

/**
 * Named members of {@link ActionBarVariant}. A convenience handle — the option and every
 * prop are typed as the string union, so `variant: 'inline'` is equally valid and needs no
 * import. Internal code (the panel resolver, the layout that positions the bar, kits)
 * references the members instead of repeating the literals.
 *
 * A const object rather than an `enum` on purpose: enum members are a nominal type, so code
 * holding the public union could not be compared against them
 * (`@typescript-eslint/no-unsafe-enum-comparison`).
 */
export const ActionBarVariant = {
	/** A positioned/sticky bar, typically overlaying the table area. The default. */
	Floating: 'floating',
	/** A normal block in the document flow, above the Toolbar. */
	Inline: 'inline',
} as const

/**
 * Render mode of the shared action bar — the selection section and the pending-draft section
 * are one bar, so both read this single value.
 *
 * Derived from {@link ActionBarVariant} so the union and the members cannot drift apart.
 */
export type ActionBarVariant = (typeof ActionBarVariant)[keyof typeof ActionBarVariant]

export type SelectionBarProps = {
	/** False when 0 rows selected — component should hide/animate out. */
	open: boolean
	/** Number of currently selected rows. */
	count: number
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	selectedRows: Row<any>[]
	/**
	 * Render mode the consumer requested.
	 * - `'floating'` (default) — sticky/positioned bar, may overlay content.
	 * - `'inline'` — rendered in normal document flow (between Toolbar and Table).
	 */
	variant: ActionBarVariant
	/**
	 * Pre-bound delete handler. Only present when `onDelete` was configured.
	 * When absent — Delete button must NOT be rendered.
	 */
	onDelete?: () => void
	/**
	 * Pre-bound clear handler.
	 * If user did not provide `onClear`, this calls `table.resetRowSelection()`.
	 */
	onClear: () => void
	/** Already-resolved actions slot (ReactElement | undefined). */
	actions?: ReactElement
}

/**
 * Pending-draft section of the shared action bar (`deferredApply`).
 *
 * While a draft is pending this section owns the bar and the selection section
 * stands down — see `<DraftBar>`. `selectedCount` is therefore rendered as a
 * **non-interactive** context chip, never as a handle for bulk actions.
 */
export type DraftBarProps = {
	/** False when nothing is pending — component should hide/animate out. */
	open: boolean
	/** How much is pending on each deferred axis. */
	pending: { sorting: number; filters: number; search: boolean }
	/** Rendered as a non-interactive context chip when rows are selected. */
	selectedCount: number
	/**
	 * Render mode the consumer requested — always the same value `SelectionBarProps.variant`
	 * receives, because the two sections share one bar.
	 * - `'floating'` (default) — sticky/positioned bar, may overlay content.
	 * - `'inline'` — rendered in normal document flow (between Toolbar and Table).
	 */
	variant: ActionBarVariant
	/** Apply the pending draft — emits one state change for the whole query. */
	onApply: () => void
	/** Discard the pending draft and restore the applied query. */
	onReset: () => void
}

export type ChevronProps = {
	expanded: boolean
	onClick: () => void
	disabled?: boolean
}

// ── DI registry ──────────────────────────────────────────────────────────

/**
 * Flat map of every injectable component. This is the **internal** shape the DI
 * context holds and every `useGridComponents()` consumer reads. Kits do not build
 * this directly — they build the nested, feature-grouped `GridComponents` (see
 * `./contract`), which the provider flattens into this registry.
 */
export type GridComponentRegistry = {
	// layout
	Table?: ComponentType<TableProps>
	Thead?: ComponentType<TheadProps>
	Tbody?: ComponentType<TbodyProps>
	Tfoot?: ComponentType<TfootProps>
	Tr?: ComponentType<TrProps>
	Th?: ComponentType<ThProps>
	Td?: ComponentType<TdProps>
	// primitives
	Button?: ComponentType<ButtonProps>
	Input?: ComponentType<InputProps>
	Checkbox?: ComponentType<CheckboxProps>
	NumberInput?: ComponentType<NumberInputProps>
	Modal?: ComponentType<ModalProps>
	// composite
	Toolbar?: ComponentType<ToolbarProps>
	GlobalFilterInput?: ComponentType<GlobalFilterInputProps>
	Pagination?: ComponentType<PaginationProps>
	PageSizer?: ComponentType<PageSizerProps>
	// data-grid specific
	Resizer?: ComponentType<ResizerProps>
	SortIndicator?: ComponentType<SortIndicatorProps>
	Menu?: ComponentType<GridMenuProps>
	VisibilityMenu?: ComponentType<VisibilityMenuProps>
	SortMenu?: ComponentType<SortMenuProps>
	FilterPopover?: ComponentType<FilterPopoverProps>
	FilterPanel?: ComponentType<FilterPanelProps>
	FilterPanelChip?: ComponentType<FilterPanelChipProps>
	FilterChip?: ComponentType<FilterChipProps>
	ClearFiltersButton?: ComponentType<ClearFiltersButtonComponentProps>
	SelectionBar?: ComponentType<SelectionBarProps>
	DraftBar?: ComponentType<DraftBarProps>
	ConfirmDialog?: ComponentType<ConfirmDialogProps>
	OperatorSelect?: ComponentType<OperatorSelectProps>
	BetweenInput?: ComponentType<BetweenInputProps>
	MultiSelectFilter?: ComponentType<MultiSelectFilterProps>
	// fallback states
	LoadingRow?: ComponentType<LoadingRowProps>
	EmptyState?: ComponentType<EmptyStateProps>
	NoResultsState?: ComponentType<NoResultsStateProps>
	// refetch overlay (server-side refetch over existing rows)
	RefetchOverlay?: ComponentType<RefetchOverlayProps>
	// infinite scroll
	LoadMoreRow?: ComponentType<LoadMoreRowProps>
	// row actions
	ActionsCell?: ComponentType<ActionsCellProps>
	// form shell (creating / editing modal)
	FormShell?: ComponentType<FormShellProps>
	// expand
	Chevron?: ComponentType<ChevronProps>
}
