'use client'

import * as React from 'react'

import { cn } from '@grid-shadcn/lib/utils'

function Table({ className, style, ...props }: React.ComponentProps<'table'>) {
	return (
		<div
			data-slot='table-container'
			className='relative w-full'
		>
			<table
				data-slot='table'
				className={cn('w-full caption-bottom text-sm', className)}
				style={{ display: 'block', ...style }}
				{...props}
			/>
		</div>
	)
}

// `forwardRef`, not a bare `ref` prop: this kit supports React 18, where `ref` never reaches a
// function component's props. The shared layer measures the header through this ref to publish
// `--dg-header-height`, and a swallowed ref leaves pinned-top rows stacked under the sticky header.
const TableHeader = React.forwardRef<HTMLTableSectionElement, React.ComponentProps<'thead'>>(function TableHeader(
	{ className, style, ...props },
	ref,
) {
	return (
		<thead
			data-slot='table-header'
			className={cn('[&_tr]:border-b', className)}
			style={{ display: 'block', ...style }}
			{...props}
			ref={ref}
		/>
	)
})

function TableBody({ className, style, ...props }: React.ComponentProps<'tbody'>) {
	return (
		<tbody
			data-slot='table-body'
			className={cn('[&_tr:last-child]:border-0', className)}
			style={{ display: 'block', ...style }}
			{...props}
		/>
	)
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
	return (
		<tfoot
			data-slot='table-footer'
			className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
			{...props}
		/>
	)
}

// `forwardRef` for the same reason as {@link TableHeader}: pinned rows are measured through it.
const TableRow = React.forwardRef<HTMLTableRowElement, React.ComponentProps<'tr'>>(function TableRow(
	{ className, style, ...props },
	ref,
) {
	return (
		<tr
			data-slot='table-row'
			className={cn(
				'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted data-[pinned]:bg-muted/40',
				className,
			)}
			style={{
				display: 'grid',
				gridTemplateColumns: 'var(--grid-template-columns)',
				...style,
			}}
			{...props}
			ref={ref}
		/>
	)
})

function TableHead({
	className,
	pinned,
	style,
	...props
}: React.ComponentProps<'th'> & { pinned?: 'left' | 'right' | false }) {
	return (
		<th
			data-slot='table-head'
			className={cn(
				'min-h-10 px-2 py-1.5 text-left font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0',
				className,
			)}
			style={pinned ? { backgroundColor: 'var(--dg-pin-cell-background)', ...style } : style}
			{...props}
		/>
	)
}

function TableCell({
	className,
	pinned,
	style,
	...props
}: React.ComponentProps<'td'> & { pinned?: 'left' | 'right' | false }) {
	return (
		<td
			data-slot='table-cell'
			className={cn('p-2 flex items-center overflow-hidden [&:has([role=checkbox])]:pr-0', className)}
			style={pinned ? { backgroundColor: 'var(--dg-pin-cell-background)', ...style } : style}
			{...props}
		/>
	)
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
	return (
		<caption
			data-slot='table-caption'
			className={cn('mt-4 text-sm text-muted-foreground', className)}
			{...props}
		/>
	)
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
