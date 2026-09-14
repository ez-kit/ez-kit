'use client'

import {
	DataGrid,
	getVisualLeafColumns,
	useDataGridState,
	useDataGridTable,
	useGridMessages,
} from '@ez-kit/data-grid-react'
import { Table as HeroTable, cn } from '@heroui/react'
import { Children, createContext, forwardRef, Fragment, isValidElement, useContext, useState } from 'react'
import { createPortal } from 'react-dom'

import type {
	TableProps,
	TableScrollProps,
	TbodyProps,
	TdProps,
	TfootProps,
	ThProps,
	TheadProps,
	TrProps,
} from '@ez-kit/data-grid-react'
import type { ComponentProps, Key, ReactNode } from 'react'

const HeaderContext = createContext<{ inHeader: boolean; rowHeaderId?: string }>({ inHeader: false })

/** Inside the footer, rows and cells are plain elements — see {@link Table}. */
const FooterContext = createContext(false)

/**
 * The grid shell's scrollport, for this kit.
 *
 * HeroUI's own scroll container is the element that has to own both axes: `.table-root` is
 * `overflow: clip` over a `minmax(0, 1fr)` grid track — a hard width boundary nothing outside
 * it can scroll past — so the scrollport cannot live above it. Registering this slot is how the
 * kit says so: the shared layer's props land on the container that actually scrolls, and its
 * `ref` is what the pin shadows, infinite scroll and the row virtualizer drive.
 *
 * Before this existed, the shared layer's own div was the scrollport and this container nested
 * inside it, competing for the same axes (CSS Overflow 3 makes a non-`visible` value on one axis
 * compute the other to `auto`, so the inner one won while nothing bounded its height). ~55 lines
 * of this kit's stylesheet existed to relocate the bound back out, and two bugs (#103, #105) came
 * from the arrangement. Both are gone with it.
 *
 * The root gets a `data-slot` of its own: HeroUI hardcodes `data-slot="table"` on it, which would
 * now collide with the real `<table>` that the shared layer stamps that slot on.
 */
export function TableScroll({ children, ...props }: TableScrollProps) {
	const heroProps = props as unknown as ComponentProps<typeof HeroTable.ScrollContainer>

	return (
		<HeroTable data-slot='table-root'>
			<HeroTable.ScrollContainer {...heroProps}>{children}</HeroTable.ScrollContainer>
		</HeroTable>
	)
}

/**
 * The table itself. `HeroTable` and its scroll container moved up into {@link TableScroll}, so
 * this renders only the collection — which means the shared layer's `data-slot='table'` and its
 * `--grid-template-columns` land on the real `<table>` rather than on HeroUI's root, and the
 * `thead` / `tbody` / `tr` rules inherit the template from the element that owns it.
 */
export function Table({ children, ...props }: TableProps) {
	const messages = useGridMessages()
	const heroProps = props as unknown as ComponentProps<typeof HeroTable.Content>
	const { collection, footer } = splitFooter(children)

	return (
		<>
			<HeroTable.Content
				aria-label={messages.grid.label}
				{...heroProps}
			>
				{collection}
			</HeroTable.Content>
			{footer === null ? null : <FooterPortal>{footer}</FooterPortal>}
		</>
	)
}

/**
 * Split `<DataGrid.Footer />` out of the table's children.
 *
 * HeroUI's table is a React Aria collection: everything under `Table.Content` is rendered by a
 * collection renderer whose "document" is not the DOM, and which understands only `Header`,
 * `Body`, `Row` and `Cell`. A `<tfoot>` is none of those, so it was silently dropped and every
 * column `footer` in this kit rendered nothing. Nor can the footer portal itself out from in
 * there — that renderer has no DOM to portal from. So it is lifted out here, before the
 * collection ever sees it, and {@link FooterPortal} puts it back into the real `<table>`.
 *
 * Fragments are walked through because the default layout hands its children over as one.
 * A footer nested any deeper (wrapped in a component of your own) stays in the collection and is
 * dropped, exactly as before.
 */
function splitFooter(children: ReactNode): { collection: ReactNode[]; footer: ReactNode | null } {
	const collection: ReactNode[] = []
	let footer: ReactNode | null = null

	const walk = (nodes: ReactNode): void => {
		for (const child of Children.toArray(nodes)) {
			if (isValidElement(child) && child.type === Fragment) {
				walk((child.props as { children?: ReactNode }).children)
				continue
			}
			if (isValidElement(child) && child.type === DataGrid.Footer) {
				footer = child
				continue
			}
			collection.push(child)
		}
	}
	walk(children)

	return { collection, footer }
}

/**
 * Render the footer into the `<table>` HeroUI produced, after its `<tbody>` — the same column
 * grid and the same scrollport, so widths, pinning and `position: sticky` resolve against the
 * real table rather than against a detached element.
 *
 * The anchor is a zero-size `<div>` rather than an id on `Table.Content`: it needs no cooperation
 * from HeroUI about which props reach the `<table>` element.
 */
function FooterPortal({ children }: { children: ReactNode }) {
	const [anchor, setAnchor] = useState<HTMLDivElement | null>(null)
	const tableEl = anchor?.parentElement?.querySelector('table') ?? null

	return (
		<>
			<div
				ref={setAnchor}
				hidden
			/>
			{tableEl === null
				? null
				: createPortal(<FooterContext.Provider value={true}>{children}</FooterContext.Provider>, tableEl)}
		</>
	)
}

// `forwardRef` rather than a `ref` prop: the shared layer measures the header through this ref to
// publish `--dg-header-height`, and on React 18 `ref` never reaches a function component's props.
export const Thead = forwardRef<HTMLTableSectionElement, TheadProps>(function Thead({ children, ...props }, ref) {
	const heroProps = props as unknown as ComponentProps<typeof HeroTable.Header>
	const rowHeaderId = useRowHeaderId()
	const table = useDataGridTable()
	// More than one level means the column defs nest (`columns[].columns`). This kit cannot render
	// the group rows — see {@link warnGroupedHeadersUnsupported} — so it keeps the leaf row, which
	// is the one that carries every affordance, and drops the rest.
	const headerRows = Children.toArray(children)
	const isGrouped = table.getHeaderGroups().length > 1 && headerRows.length > 1
	if (isGrouped) warnGroupedHeadersUnsupported()

	return (
		<HeroTable.Header
			{...heroProps}
			ref={ref}
		>
			<HeaderContext.Provider value={{ inHeader: true, ...(rowHeaderId === undefined ? {} : { rowHeaderId }) }}>
				{isGrouped ? headerRows.at(-1) : children}
			</HeaderContext.Provider>
		</HeroTable.Header>
	)
})

const IS_DEV = process.env.NODE_ENV !== 'production'

/** One warning per page, however many grouped grids render. */
let hasWarnedGroupedHeaders = false

/**
 * Grouped headers render flat in this kit, and say so once in development.
 *
 * HeroUI's table is a React Aria collection, and React Aria **removed** nested column support
 * before its GA — adobe/react-spectrum#5537 deleted it, and the request to bring it back
 * (adobe/react-spectrum#5263) has been open since 2023 with no API proposed. A `Column` nested in
 * a `Column` is not a collection node there: its children render as the parent cell's content, so
 * the leaves register as nothing and the collection throws `Cell count must match column count`
 * before a row is drawn.
 *
 * Dropping the group rows is the least bad answer available here. The alternative — painting a
 * second header outside the collection — means a `role="columnheader"` structure React Aria does
 * not know about, hand-written `aria-colspan`, and widths to re-sync on every resize, reorder and
 * hide. A flat header is a missing decoration; that would be a lying accessibility tree.
 *
 * The shadcn kit renders grouped headers correctly.
 */
function warnGroupedHeadersUnsupported(): void {
	if (!IS_DEV || hasWarnedGroupedHeaders) return
	hasWarnedGroupedHeaders = true
	console.warn(
		'[@ez-kit/data-grid-heroui] Grouped headers (`columns[].columns`) render flat in this kit: ' +
			'HeroUI builds on React Aria, which dropped nested column support before GA ' +
			'(adobe/react-spectrum#5537, still unresolved in #5263). The leaf columns render as usual — ' +
			'only the group row is missing. Use the shadcn kit if the group row matters.',
	)
}

export function Tbody(props: TbodyProps) {
	return <HeroTable.Body {...(props as unknown as ComponentProps<typeof HeroTable.Body>)} />
}

/**
 * The `<tfoot>` itself. Plain, because {@link splitFooter} has already lifted it out of the
 * collection and {@link FooterPortal} has put it inside the real `<table>`. HeroUI's own
 * `Table.Footer` is no help here: it is a container *outside* the table, meant for pagination,
 * with none of the column grid.
 */
export function Tfoot(props: TfootProps) {
	return <tfoot {...props} />
}

// `forwardRef` for the same reason as {@link Thead}: pinned rows are measured through this ref.
export const Tr = forwardRef<HTMLTableRowElement, TrProps>(function Tr({ children, ...props }, ref) {
	const { inHeader } = useContext(HeaderContext)
	const inFooter = useContext(FooterContext)

	// Header rows render as a fragment and footer rows as a plain `<tr>`; neither is ever measured,
	// so only the footer branch has an element to hand the ref to.
	if (inHeader) return <>{children}</>
	if (inFooter)
		return (
			<tr
				className='table__row'
				{...props}
				ref={ref}
			>
				{children}
			</tr>
		)

	const propsWithData = props as TrProps & { 'data-row-id'?: Key }
	const maybeRowId = propsWithData.id ?? propsWithData['data-row-id']
	const rowId =
		typeof maybeRowId === 'symbol' ? undefined : typeof maybeRowId === 'bigint' ? String(maybeRowId) : maybeRowId
	const heroProps = propsWithData as unknown as ComponentProps<typeof HeroTable.Row>

	// `data-row-id` is passed through, not consumed: React Aria needs the value as its
	// collection `id` (it surfaces as `data-key`), but the attribute itself is part of the
	// react layer's row contract — see `row.tsx` — and a kit that swallows it breaks any CSS
	// or test written against `[data-row-id]` for that kit alone.
	return (
		<HeroTable.Row
			{...heroProps}
			{...(rowId === undefined ? {} : { id: rowId })}
			ref={ref}
		>
			{children}
		</HeroTable.Row>
	)
})

export function Th({ pinned, className, ...props }: ThProps) {
	const { rowHeaderId } = useContext(HeaderContext)
	const propsWithData = props as ThProps & { 'data-column-id'?: string }
	const columnId = propsWithData['data-column-id']
	const baseHeroProps = props as unknown as ComponentProps<typeof HeroTable.Column>
	const isRowHeader = rowHeaderId !== undefined && columnId !== undefined && columnId === rowHeaderId
	const mergedClassName = cn(className, pinned ? 'bg-surface-secondary' : undefined) ?? ''

	return (
		<HeroTable.Column
			{...baseHeroProps}
			{...(columnId !== undefined ? { id: columnId } : {})}
			className={mergedClassName}
			{...(isRowHeader ? { isRowHeader: true } : {})}
		/>
	)
}

export function Td({ pinned, className, style, ...props }: TdProps) {
	const inFooter = useContext(FooterContext)
	// Rows are CSS grids (see styles.css "grid column model"), and `colSpan` means nothing to a
	// grid item — a full-width fallback cell would sit in the first track. Span it explicitly,
	// the same way the shadcn kit's Td does. `colSpan` itself stays on the element for a11y.
	const { colSpan } = props
	const spans = typeof colSpan === 'number' && colSpan > 1
	const resolvedStyle = {
		...(spans ? { gridColumn: `1 / span ${String(colSpan)}` } : {}),
		...(pinned ? { backgroundColor: 'var(--dg-pin-cell-background)' } : {}),
		...style,
	}
	if (inFooter)
		return (
			<td
				{...props}
				className={cn('table__cell', className) ?? ''}
				style={resolvedStyle}
			/>
		)

	return (
		<HeroTable.Cell
			{...(props as unknown as ComponentProps<typeof HeroTable.Cell>)}
			className={cn(className) ?? ''}
			style={resolvedStyle}
		/>
	)
}

/**
 * The column react-aria should treat as each row's header.
 *
 * Read from the table instance, not from the JSX. This walked `Thead`'s children looking for a
 * `data-column-id` prop, which meant the kit depended on the exact element shape the shared layer
 * happened to render — so `<DataGrid.HeaderRow>` / `<DataGrid.HeaderCell>` coming between `Thead`
 * and `Th` hid every column from it, no column got `isRowHeader`, and react-aria threw
 * "A table must have at least one Column with the isRowHeader prop set to true".
 *
 * The first visible non-system column is the same one the old scan found, and the column model
 * cannot be hidden behind a component boundary. It is read in *visual* order, so pinning a
 * column moves the row header with it rather than leaving it on whatever column was declared
 * first.
 */
function useRowHeaderId(): string | undefined {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnPinning)
	for (const column of getVisualLeafColumns(table)) {
		if (column.columnDef.meta?.isSystemColumn === true) continue
		return column.id
	}
	return undefined
}
