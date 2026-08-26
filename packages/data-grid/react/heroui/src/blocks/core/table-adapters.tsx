'use client'

import { useDataGridState, useDataGridTable } from '@ez-kit/data-grid-react'
import { Table as HeroTable, cn } from '@heroui/react'
import { createContext, useContext } from 'react'

import type { TableProps, TbodyProps, TdProps, TfootProps, ThProps, TheadProps, TrProps } from '@ez-kit/data-grid-react'
import type { ComponentProps, Key } from 'react'

const HeaderContext = createContext<{ inHeader: boolean; rowHeaderId?: string }>({ inHeader: false })

export function Table({ children, ...props }: TableProps) {
	const heroProps = props as unknown as ComponentProps<typeof HeroTable>

	return (
		<HeroTable {...heroProps}>
			<HeroTable.ScrollContainer data-slot='table-scroll-container'>
				<HeroTable.Content aria-label='Data grid'>{children}</HeroTable.Content>
			</HeroTable.ScrollContainer>
		</HeroTable>
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
 * HeroUI's table has no footer slot of its own, so this renders a plain `<tfoot>`. It carries
 * no styling — visuals belong to whatever the consumer puts inside it.
 */
export function Tfoot(props: TfootProps) {
	return <tfoot {...props} />
}

export function Tr({ children, ...props }: TrProps) {
	const { inHeader } = useContext(HeaderContext)

	if (inHeader) return <>{children}</>

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
	// Rows are CSS grids (see global.css "grid column model"), and `colSpan` means nothing to a
	// grid item — a full-width fallback cell would sit in the first track. Span it explicitly,
	// the same way the shadcn kit's Td does. `colSpan` itself stays on the element for a11y.
	const { colSpan } = props
	const spans = typeof colSpan === 'number' && colSpan > 1
	const resolvedStyle = {
		...(spans ? { gridColumn: `1 / span ${String(colSpan)}` } : {}),
		...(pinned ? { backgroundColor: 'var(--dg-pin-cell-background)' } : {}),
		...style,
	}
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
