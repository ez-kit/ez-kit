'use client'

import { Table as HeroTable, cn } from '@heroui/react'
import { Children, createContext, isValidElement, useContext, useMemo } from 'react'

import type { TableProps, TbodyProps, TdProps, ThProps, TheadProps, TrProps } from '@ez-kit/data-grid-react'
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
	const rowHeaderId = useMemo(() => findRowHeaderId(children), [children])

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

function findRowHeaderId(children: React.ReactNode): string | undefined {
	for (const row of Children.toArray(children)) {
		if (!isValidElement(row)) continue
		const rowChildren = (row.props as { children?: React.ReactNode }).children

		for (const column of Children.toArray(rowChildren)) {
			if (!isValidElement(column)) continue
			const columnProps = column.props as { 'data-column-id'?: string }
			const columnId = columnProps['data-column-id']
			if (columnId === undefined) continue
			if (columnId.includes('__selection__')) continue
			return columnId
		}
	}
	return undefined
}
