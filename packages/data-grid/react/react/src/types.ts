import type { GridContextAtom } from './grid-context'
import type { GridMenuItem, GridMenuProps } from './menu'
import type { ResolvedGridOptions } from './resolved-options'
import type {
	BetweenInputType,
	BetweenValue,
	DataTable as CoreDataTable,
	DatePreset,
	DateRangePreset,
	DateValuePreset,
	ColumnPinSide,
	FilterOperatorDef,
	LoadMoreDirection,
	FilterItem,
	PendingCount,
} from '@ez-kit/data-grid-core'
import type { Row, TableFeatures } from '@tanstack/table-core'
import type {
	ButtonHTMLAttributes,
	ComponentType,
	HTMLAttributes,
	InputHTMLAttributes,
	KeyboardEventHandler,
	MouseEventHandler,
	ReactNode,
	RefAttributes,
	TdHTMLAttributes,
	ThHTMLAttributes,
	TouchEventHandler,
} from 'react'

/**
 * The feature set every component below `<DataGrid>` is typed against.
 *
 * Components receive the table through `useDataGridTable()`, which is a React context and
 * therefore not generic — so they cannot carry the caller's `TFeatures`. They pin to
 * `TableFeatures`, the widest instantiation, which is also the *fullest*: `TableFeatures`
 * declares every feature key optionally, so `TableState<TableFeatures>` resolves to all
 * 21 slices, each at its own type rather than `… | undefined` (verified by probe —
 * `keyof` it yields the 21, and `['sorting']` yields `SortingState`).
 *
 * **The cost, stated rather than engineered around:** a component read is not gated on the
 * feature being registered. `sort-menu-trigger.tsx` type-checks `state.sorting` against a
 * grid built without `rowSortingFeature` and finds `undefined` at runtime. This is the same
 * accepted cost as the runtime-only config guards one layer down (see
 * `TableConfig`'s docblock in core), and it is what keeps the package's 95 non-test files
 * non-generic.
 * The catch for it is core's development-mode `REQUIRED_FEATURE` warning and nothing else.
 */
export type GridFeatures = TableFeatures

/*
 * FEATURE GUARDS — why the render path is full of `?.` on things the types say are always there.
 *
 * {@link GridFeatures} pins components to `TableFeatures`, the widest instantiation, which is also
 * the *fullest*: it declares every feature key, so `TableState<TableFeatures>` resolves to all 21
 * slices and `Column<TableFeatures, …>` carries every feature's methods. At **runtime** none of
 * that is true — a slice is absent, and a method undefined, unless the consumer registered the
 * feature that contributes it.
 *
 * That gap is the documented cost of the pinning, and it is why `typescript-eslint`'s
 * `no-unnecessary-condition` fires on every guard on the default render path: the rule is reading
 * the widest instantiation and concluding the check cannot fail. It can, and did — a grid with no
 * sorting threw on `getCanSort`, a read-only grid threw on `state.creating.isOpen`, and a grid with
 * no infinite scroll threw on `state.infinite.isFetchingNextPage`, because `<LoadMoreFooter />`
 * mounts unconditionally.
 *
 * Each such guard therefore carries a scoped disable citing this note. They are not decoration and
 * they are not suppressing a real finding: `feature-optionality.test.tsx` builds a grid without
 * each optional feature and renders it, so deleting any one of them turns a lint error into a test
 * failure rather than into silence.
 *
 * The three features that stay mandatory — `columnVisibilityFeature`, `columnPinningFeature`,
 * `columnSizingFeature` — are structural rather than guarded: the shell lays out a column grid and
 * needs widths and pin groups to do it. That test asserts they still throw, so the boundary between
 * "structural" and "defect" is executable rather than asserted.
 */

/**
 * The row type every component below `<DataGrid>` is typed against — the **erased** one.
 *
 * Same boundary as {@link GridFeatures}, for the same reason, and the two should be read as one
 * decision: components receive the table through `useDataGridTable()`, which is a React context
 * and therefore not generic, so they cannot carry the caller's `TRow` any more than they can
 * carry its `TFeatures`.
 *
 * Unlike `TFeatures` there is no "widest instantiation" to pin to, because v9's row types are
 * **invariant** in `TRow`: `Row<F, TRow>` holds `original: TRow` covariantly and reaches
 * `column.accessorFn: (row: TRow) => unknown` contravariantly. Verified by probe — `Row<F, User>`
 * is assignable to `Row<F, any>`, `Row<F, object>` and `Row<F, RowData>` alike, which is to say
 * to none of them; `any` in particular stopped erasing when v8 became v9, because it only erases
 * at the top level and not inside a generic instantiation. So the row type is not widened here,
 * it is *erased*, and crossing into the erased world is a cast rather than an assignment.
 *
 * `never` rather than `object` or `any` because that is already this package's spelling for the
 * same idea — `RowPropsResolver<never>`, `GridOptions<never>`, `ExpandedRowProps<never>` — and one
 * concept deserves one spelling.
 *
 * **The cost, stated rather than engineered around:** a component read is not checked against the
 * caller's row type. A component that reaches `row.original` gets `never` and must say what it
 * expects. The crossings are named and counted in `pr3-outcomes.md`; if a cast for this appears
 * anywhere other than at one of them, the boundary has been put in the wrong place.
 */
export type ErasedRow = never

/**
 * The table the React layer renders: core's `DataTable` with `grid` **replaced** by the
 * resolved React options, plus the grid context.
 *
 * `Omit` rather than an intersection, deliberately. An intersection of two objects that
 * both declare `grid` produces a type whose `grid` is the *intersection of the two bags* —
 * legal, silently satisfied by either half, and impossible for a reader to tell apart. That
 * is the §2.1 seam written into the type system instead of out of it. The four members core
 * resolved are not lost by the `Omit`: they are folded into {@link ResolvedGridOptions} under
 * its own names, and `defaultResolvedGridOptions(table.grid)` is what carries them across.
 *
 * `TFeatures` is threaded rather than pinned because this alias is `useDataGrid`'s return type
 * and therefore part of the public surface.
 */
export type DataTable<TFeatures extends TableFeatures, TRow extends object> = Omit<
	CoreDataTable<TFeatures, TRow>,
	'grid'
> & {
	/**
	 * The React layer's resolved grid options. Seeded by `prepareDataGridTable`, rewritten once
	 * per render by `useDataGrid`, read by every compound component and available to a UI kit
	 * via `useGridOptions()`.
	 */
	grid: ResolvedGridOptions
	/**
	 * The grid's `GridContext`, behind a subscription. Seeded by `prepareDataGridTable` so it is
	 * **always** an atom — no reader guards the property — and written by `useDataGrid` whenever
	 * the merged `context` option changes. Read it with `useGridContext()`.
	 *
	 * Parked here by Task 14 only so that it stops being declared through a
	 * `declare module '@tanstack/table-core'` block, which cannot merge onto v9's `Table` type
	 * alias.
	 */
	gridContext: GridContextAtom
}

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

type ActionsCellIdleProps<TRow extends object = ErasedRow> = {
	state: typeof ActionsCellState.Idle
	row: Row<GridFeatures, TRow>
	hasEditing: boolean
	hasDeleting: boolean
	onEdit: () => void
	onDelete: () => void
	/**
	 * The row's own actions that asked for `placement: 'inline'`, already resolved to the menu
	 * model — render each as an icon button beside Edit and Delete, in order, and a
	 * {@link GridMenuItemSlot} as its bare `component`.
	 *
	 * Empty for the overwhelming majority of grids. Their menu-placed siblings never reach a
	 * kit this way: those go through the shared `Menu` with the pin entries.
	 */
	actions: GridMenuItem[]
}

type ActionsCellEditingProps<TRow extends object = ErasedRow> = {
	state: typeof ActionsCellState.Editing
	row: Row<GridFeatures, TRow>
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
export type ActionsCellProps<TRow extends object = ErasedRow> =
	| ActionsCellIdleProps<TRow>
	| ActionsCellEditingProps<TRow>
	| ActionsCellCreatingProps

// ── primitive component props ─────────────────────────────────────────────

/**
 * The grid shell's outer box — the positioning context the pin-shadow overlay is drawn against,
 * the element the shadow custom properties are written to, and the one `Header` finds with
 * `closest("[data-slot='table-wrapper']")`.
 *
 * Optional: a kit that registers nothing gets a plain `div`, which is what both kits in this
 * repo use. A kit that registers one **must spread every prop it receives** — `data-slot`,
 * `data-virtualized`, `className`, `style` (it carries the height custom properties) — because
 * the structural stylesheet targets the `data-slot`, not the element, and **must forward `ref`
 * to the element that establishes the positioning context**.
 */
export type TableWrapperProps = HTMLAttributes<HTMLDivElement> & RefAttributes<HTMLDivElement>
/**
 * The grid shell's scrollport.
 *
 * Optional, with the same spread obligation as {@link TableWrapperProps}, and one rule of its
 * own: **`ref` must land on the element that actually scrolls.** That is what the pin shadows
 * read, what infinite scroll measures, what the row virtualizer drives, and what gets stamped
 * `data-scrollport` — so a kit that nests its own scroll container puts the ref on that
 * container rather than on its outermost box.
 *
 * @example — a kit whose own scroller is nested
 * const TableScroll = forwardRef<HTMLDivElement, TableScrollProps>(function TableScroll(props, ref) {
 *   return (
 *     <KitTable>
 *       <KitTable.ScrollContainer ref={ref} {...props} />
 *     </KitTable>
 *   )
 * })
 */
export type TableScrollProps = HTMLAttributes<HTMLDivElement> & RefAttributes<HTMLDivElement>

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
/**
 * `pinned` is the core `ColumnPinSide`, widened with `false` for the unpinned majority.
 *
 * The ref must reach the rendered cell, as on {@link TheadProps} and {@link TrProps}: a header
 * is the element a pointer drag reorders a column by, and a drag library is handed the node
 * through a ref. A kit that swallows it still renders correctly and still typechecks — the
 * affordance just never attaches.
 */
export type ThProps = ThHTMLAttributes<HTMLTableCellElement> &
	RefAttributes<HTMLTableCellElement> & { pinned?: ColumnPinSide | false }
export type TdProps = TdHTMLAttributes<HTMLTableCellElement> & { pinned?: ColumnPinSide | false }
/** The ref must reach the rendered button — a drag handle is a button a drag library holds by ref. */
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & RefAttributes<HTMLButtonElement>
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

/**
 * The kit's toolbar shell. `start` / `end` are logical, not physical: the bar is a flex row, so
 * the two slots swap sides under RTL, and `left` / `right` named the wrong one half the time.
 * Column pinning keeps `left` / `right` — a viewport edge does not flip.
 */
export type ToolbarProps = {
	children?: ReactNode
	/** Leading slot — rendered first in the reading direction. */
	start?: ReactNode
	/** Trailing slot — rendered last in the reading direction. */
	end?: ReactNode
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
 *   `draft`. `undefined` when there is nothing to wire (e.g. `draft` off).
 */
export type GlobalFilterInputProps = {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	debounce?: number
	onKeyDown?: KeyboardEventHandler<HTMLInputElement>
}

/**
 * Named members of {@link PaginationLabel}. A convenience handle — the option and the label
 * builder are typed as the string union, so `label: 'page'` is equally valid and needs no
 * import. Internal code (defaults, label builder) references the members instead of repeating
 * the literals.
 *
 * A const object rather than an `enum` on purpose: enum members are a nominal type, so code
 * holding the public union could not be compared against them
 * (`@typescript-eslint/no-unsafe-enum-comparison`).
 */
export const PaginationLabel = {
	/** `1–10 of 50` — the slice of the total on screen. Needs a total; falls back to {@link PaginationLabel.Page}. */
	Range: 'range',
	/** `Page 2 of 5`, or `Page 2` when the page count is unknown. */
	Page: 'page',
} as const

/**
 * Which of the two built-in forms the footer's label takes. The label is one axis of the
 * footer's presentation, independent of which controls render (`pagination.links` /
 * `pagination.edges`) — a numbered strip can carry the page counter and prev/next alone can
 * carry the range.
 *
 * Derived from {@link PaginationLabel} so the union and the members cannot drift apart.
 */
export type PaginationLabel = (typeof PaginationLabel)[keyof typeof PaginationLabel]

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
	/**
	 * Render the page-number links beside prev/next. Resolved by the react layer; never
	 * undefined. A kit still drops them when `pageCount` is unknown — they cannot be
	 * enumerated without a total.
	 */
	links: boolean
	/** Render jump-to-first / jump-to-last buttons. Resolved by the react layer; never undefined. */
	edges: boolean
	/**
	 * `links` only. Pages kept either side of the current one in the page-link strip.
	 * Resolved by the react layer; never undefined. Feed it to `buildPageWindow` rather than
	 * looping over `pageCount` — see {@link https://github.com/ez-kit/ez-kit/issues/106}.
	 */
	siblings: number
	/** `links` only. Pages kept at each end of the page-link strip. Never undefined. */
	boundaries: number
	/**
	 * The footer's label, already resolved by the react layer — the shared
	 * {@link buildPaginationLabel} output, whatever a `pagination.label` renderer returned, or
	 * `undefined` when the option is `false`.
	 *
	 * Render it as given. A kit that calls `buildPaginationLabel` for itself silently ignores
	 * `pagination.label`, which is the drift this prop exists to remove: the label is content,
	 * the kit owns only where it sits and how it looks.
	 */
	label?: ReactNode
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
	MoveUp: 'move-up',
	MoveDown: 'move-down',
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
	/**
	 * Whether the visibility toggle is offered for this column.
	 *
	 * Always `true` in the default Columns toggle, which lists nothing else. It is only
	 * `ordering.column.visibilityMenu` that puts a locked column on the list — there because it
	 * holds a place in the column order and may still be moved, with its toggle rendered
	 * disabled rather than left out, so the rows stay a single column of controls.
	 */
	canHide: boolean
	onToggle: () => void
	/**
	 * The two one-step moves along the column order, or absent when this menu does not offer
	 * reordering at all — which is the default.
	 *
	 * The vocabulary is logical, the same `start` / `end` the core step uses, because the order
	 * flips under RTL. What glyph stands for each is the kit's decision: both kits here draw a
	 * vertical pair, the list running from the start of the order at the top.
	 *
	 * Present on every listed column once the menu offers moves, with both flags `false` for a
	 * column the author locked — the disabled pair is what says "this one is fixed".
	 */
	ordering?: {
		canMoveStart: boolean
		canMoveEnd: boolean
		onMoveStart: () => void
		onMoveEnd: () => void
	}
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
	 * True when this filter is part of the not-yet-applied draft under `draft` — i.e.
	 * it differs from (or is absent from) `table.store.state.applied`. Kits render this as
	 * `data-draft-filter=""` on the chip's root element.
	 */
	isDraft: boolean
}

/**
 * The kit's clear button. Singular because it clears *a* filter, and which one is the caller's
 * business: the toolbar's `<DataGrid.ClearFiltersButton />` hands it every filter in the table,
 * and a column's filter row hands it that one column. The label is what tells them apart.
 */
export type ClearFilterButtonProps = {
	/** True when there is nothing to clear; kit can render the button in a disabled state. */
	disabled: boolean
	/** Clears whatever the caller wired up — every filter, or one column's. */
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
	type: BetweenInputType
	/** Render the number range as a slider. Only ever `true` when both bounds are resolved. */
	slider?: boolean | undefined
	min?: number
	max?: number
}

export type { DatePreset, DateRangePreset, DateValuePreset, FilterItem }

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
 * - a "Load more" button when `trigger` is {@link LoadMoreTrigger.Manual} and `hasNextPage` (calls `onTrigger`)
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
 * Which region the auto-mounted page-size selector renders in.
 *
 * A *region*, which is why it is `placement` and not the `position` that
 * {@link FilterChipsPosition} uses: that option names a spot on one axis (above or below the
 * table), this one names which of two containers holds the control.
 *
 * Named members for internal reference; the option is typed as the plain string union, so
 * `pageSizer: 'footer'` is equally valid and needs no import.
 */
export const PageSizerPlacement = {
	/** Leading slot of the toolbar, above the table. The default. */
	Toolbar: 'toolbar',
	/** The pagination row under the table, before the pagination controls. */
	Footer: 'footer',
} as const

export type PageSizerPlacement = (typeof PageSizerPlacement)[keyof typeof PageSizerPlacement]

/**
 * Which region holds the auto-mounted filter panel under
 * {@link FilteringVariant.Panel}.
 *
 * `placement`, like {@link PageSizerPlacement} and for the same reason: the values name a
 * container, not a spot on an axis the way `filtering.chips`' `position` does.
 */
export const FilterPanelPlacement = {
	/** Its own strip between the toolbar and the table. The default. */
	Above: 'above',
	/** The leading slot of the toolbar, beside the other toolbar controls. */
	Toolbar: 'toolbar',
} as const

export type FilterPanelPlacement = (typeof FilterPanelPlacement)[keyof typeof FilterPanelPlacement]

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
	/**
	 * More rows can be loaded in this direction — the resolved `pagination.hasNextPage`, under
	 * the same name it has as an option. It was `hasMore`, so one flag changed its spelling on
	 * the way from the config to the kit.
	 */
	hasNextPage: boolean
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
	selectedRows: Row<GridFeatures, ErasedRow>[]
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
	/**
	 * Custom action entries from `selection.bar.actions`, already resolved against the current
	 * selection and namespaced. Rendered as buttons beside the built-in Delete, with the same
	 * chrome the row-actions menu gives its entries: `icon` mapped through the kit's glyph map,
	 * `destructive` in the kit's danger colour, `disabled` honoured.
	 *
	 * Absent when the bar config supplied none. An empty array is possible — the callback may
	 * return `[]` for a selection that offers nothing — and renders no buttons.
	 */
	actions?: GridMenuItem[]
	/**
	 * Markup from the `start` / `end` slots of `<DataGrid.SelectionBar>`, rendered as-is at
	 * either end of the bar's controls. This is the escape hatch for content that is not an
	 * action — a bulk-target select, a counter — which `actions` deliberately cannot express.
	 */
	start?: ReactNode
	/** See {@link SelectionBarProps.start}. */
	end?: ReactNode
}

/**
 * Pending-draft section of the shared action bar (`draft`).
 *
 * While a draft is pending this section owns the bar and the selection section
 * stands down — see `<DraftBar>`. `selectedCount` is therefore rendered as a
 * **non-interactive** context chip, never as a handle for bulk actions.
 */
export type DraftBarProps = {
	/** False when nothing is pending — component should hide/animate out. */
	open: boolean
	/**
	 * How much is pending on each deferred axis, keyed by {@link DraftAxis}. The core
	 * {@link PendingCount} verbatim, rather than a hand-written twin that spelled the same three
	 * axes `sorting` / `filters` / `search`.
	 */
	pending: PendingCount
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
	/** Optional — see {@link TableWrapperProps}. Falls back to a plain `div`. */
	TableWrapper?: ComponentType<TableWrapperProps>
	/** Optional — see {@link TableScrollProps}. Falls back to a plain `div`. */
	TableScroll?: ComponentType<TableScrollProps>
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
	ClearFilterButton?: ComponentType<ClearFilterButtonProps>
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
