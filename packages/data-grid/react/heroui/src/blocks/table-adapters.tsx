'use client'

import { Table as HeroTable, cn } from '@heroui/react'
import { Children, createContext, isValidElement, useContext, useMemo } from 'react'

import type { TableProps, TbodyProps, TdProps, ThProps, TheadProps, TrProps } from '@ez-kit/data-grid-react'
import type { ComponentProps, Key } from 'react'

const HeaderContext = createContext<{ inHeader: boolean; rowHeaderKey?: Key }>({ inHeader: false })

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
	const rowHeaderKey = useMemo(() => findRowHeaderKey(children), [children])

	return (
		<HeroTable.Header {...heroProps}>
			<HeaderContext value={{ inHeader: true, ...(rowHeaderKey === undefined ? {} : { rowHeaderKey }) }}>
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
	const { rowHeaderKey } = useContext(HeaderContext)
	const propsWithData = props as ThProps & { 'data-column-id'?: string }
	const columnId = propsWithData['data-column-id']
	const baseHeroProps = props as unknown as ComponentProps<typeof HeroTable.Column>
	const isRowHeader = rowHeaderKey !== undefined && columnId !== undefined && columnId === rowHeaderKey
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
	const resolvedStyle = pinned
		? { backgroundColor: 'var(--dg-pin-cell-background)', ...style }
		: style
	return (
		<HeroTable.Cell
			{...(props as unknown as ComponentProps<typeof HeroTable.Cell>)}
			className={cn(className) ?? ''}
			{...(resolvedStyle ? { style: resolvedStyle } : {})}
		/>
	)
}

function findRowHeaderKey(children: React.ReactNode): Key | undefined {
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
