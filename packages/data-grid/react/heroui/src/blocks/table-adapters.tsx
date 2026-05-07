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
	const heroProps = props as unknown as ComponentProps<typeof HeroTable.Column>
	const isRowHeader = rowHeaderKey !== undefined && heroProps.id === rowHeaderKey
	const mergedClassName = cn(className, pinned ? 'bg-surface-secondary' : undefined) ?? ''

	return (
		<HeroTable.Column
			{...heroProps}
			className={mergedClassName}
			{...(isRowHeader ? { isRowHeader: true } : {})}
		/>
	)
}

export function Td({ pinned, className, style, ...props }: TdProps) {
	return (
		<HeroTable.Cell
			{...(props as unknown as ComponentProps<typeof HeroTable.Cell>)}
			className={cn(className) ?? ''}
			style={pinned ? { backgroundColor: 'var(--dg-pin-cell-background)', ...style } : style}
		/>
	)
}

function findRowHeaderKey(children: React.ReactNode): Key | undefined {
	for (const row of Children.toArray(children)) {
		if (!isValidElement(row)) continue
		const rowChildren = (row.props as { children?: React.ReactNode }).children

		for (const column of Children.toArray(rowChildren)) {
			if (!isValidElement(column)) continue
			const columnKey = column.key
			if (columnKey == null) continue
			const normalizedKey = normalizeKey(columnKey)
			if (String(normalizedKey).includes('__selection__')) continue
			return normalizedKey
		}
	}
	return undefined
}

function normalizeKey(key: string | number | bigint): Key {
	const normalized = typeof key === 'bigint' ? String(key) : key
	if (typeof normalized === 'string' && normalized.startsWith('.$')) return normalized.slice(2)
	return normalized
}
