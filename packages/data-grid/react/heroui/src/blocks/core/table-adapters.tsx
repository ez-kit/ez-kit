'use client'

import { DataGrid, useDataGridState, useDataGridTable } from '@ez-kit/data-grid-react'
import { Table as HeroTable, cn } from '@heroui/react'
import { Children, createContext, Fragment, isValidElement, useContext, useState } from 'react'
import { createPortal } from 'react-dom'

import type { TableProps, TbodyProps, TdProps, TfootProps, ThProps, TheadProps, TrProps } from '@ez-kit/data-grid-react'
import type { ComponentProps, Key, ReactNode } from 'react'

const HeaderContext = createContext<{ inHeader: boolean; rowHeaderId?: string }>({ inHeader: false })

/** Inside the footer, rows and cells are plain elements — see {@link Table}. */
const FooterContext = createContext(false)

export function Table({ children, ...props }: TableProps) {
	const heroProps = props as unknown as ComponentProps<typeof HeroTable>
	const { collection, footer } = splitFooter(children)

	return (
		<HeroTable {...heroProps}>
			<HeroTable.ScrollContainer data-slot='table-scroll-container'>
				<HeroTable.Content aria-label='Data grid'>{collection}</HeroTable.Content>
				{footer === null ? null : <FooterPortal>{footer}</FooterPortal>}
			</HeroTable.ScrollContainer>
		</HeroTable>
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
			{tableEl === null ? null : createPortal(<FooterContext value={true}>{children}</FooterContext>, tableEl)}
		</>
	)
}

export function Thead({ children, ...props }: TheadProps) {
	const heroProps = props as unknown as ComponentProps<typeof HeroTable.Header>
	const rowHeaderId = useRowHeaderId()

	return (
		<HeroTable.Header {...heroProps}>
			<HeaderContext value={{ inHeader: true, ...(rowHeaderId === undefined ? {} : { rowHeaderId }) }}>
				{children}
			</HeaderContext>
		</HeroTable.Header>
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

export function Tr({ children, ...props }: TrProps) {
	const { inHeader } = useContext(HeaderContext)
	const inFooter = useContext(FooterContext)

	if (inHeader) return <>{children}</>
	if (inFooter)
		return (
			<tr
				className='table__row'
				{...props}
			>
				{children}
			</tr>
		)

	const propsWithData = props as TrProps & { 'data-row-id'?: Key }
	const maybeRowId = propsWithData.id ?? propsWithData['data-row-id']
	const rowId =
		typeof maybeRowId === 'symbol' ? undefined : typeof maybeRowId === 'bigint' ? String(maybeRowId) : maybeRowId
	const { 'data-row-id': _dataRowId, ...rest } = propsWithData
	const heroProps = rest as unknown as ComponentProps<typeof HeroTable.Row>

	return (
		<HeroTable.Row
			{...heroProps}
			{...(rowId === undefined ? {} : { id: rowId })}
		>
			{children}
		</HeroTable.Row>
	)
}

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
 * cannot be hidden behind a component boundary.
 */
function useRowHeaderId(): string | undefined {
	const table = useDataGridTable()
	useDataGridState((s) => s.columnVisibility)
	useDataGridState((s) => s.columnPinning)
	for (const column of table.getVisibleLeafColumns()) {
		if (column.columnDef.meta?.isSystemColumn === true) continue
		return column.id
	}
	return undefined
}
