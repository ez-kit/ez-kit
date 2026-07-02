'use client'

import { ArrowUpDown, Plus, Trash2 } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'

import type { SortMenuItem, SortMenuProps } from '@ez-kit/data-grid-react'

function SortRow({ item, index }: { item: SortMenuItem; index: number }) {
	return (
		<div
			className='flex items-center gap-1.5'
			data-slot='sort-row'
		>
			<span className='w-12 shrink-0 text-xs text-muted-foreground'>{index === 0 ? 'sort by' : 'then by'}</span>

			<Select
				value={item.columnId}
				onValueChange={item.onChangeColumn}
			>
				<SelectTrigger
					className='h-8 flex-1 text-xs'
					aria-label='Sort column'
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{item.availableColumns.map((col) => (
						<SelectItem
							key={col.id}
							value={col.id}
							className='text-xs'
						>
							{col.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={item.direction}
				onValueChange={(v) => {
					item.onChangeDirection(v as 'asc' | 'desc')
				}}
			>
				<SelectTrigger
					className='h-8 w-[7.5rem] text-xs'
					aria-label='Sort direction'
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem
						value='asc'
						className='text-xs'
					>
						Ascending
					</SelectItem>
					<SelectItem
						value='desc'
						className='text-xs'
					>
						Descending
					</SelectItem>
				</SelectContent>
			</Select>

			<Button
				variant='ghost'
				size='icon'
				className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive'
				onClick={item.onRemove}
				aria-label='Remove sort'
			>
				<Trash2 className='h-3.5 w-3.5' />
			</Button>
		</div>
	)
}

export function SortMenu({ items, canAddSort, onAddSort, onResetSorting }: SortMenuProps) {
	const activeCount = items.length

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='h-8 gap-1.5'
					data-slot='sort-trigger'
				>
					<ArrowUpDown className='h-4 w-4' />
					Sort
					{activeCount > 0 ? (
						<span className='ml-0.5 rounded-full bg-primary px-1.5 py-0 text-xs leading-5 font-medium text-primary-foreground'>
							{activeCount}
						</span>
					) : null}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='end'
				className='w-[26rem] p-3'
				data-slot='sort-menu'
			>
				{activeCount === 0 ? (
					<p className='mb-3 px-1 text-xs text-muted-foreground'>No sorts applied. Add one to start sorting.</p>
				) : (
					<div className='mb-3 space-y-2'>
						{items.map((item, index) => (
							<SortRow
								key={`${String(index)}-${item.columnId}`}
								item={item}
								index={index}
							/>
						))}
					</div>
				)}

				<div className='flex items-center justify-between gap-2 border-t pt-3'>
					<Button
						variant='ghost'
						size='sm'
						className='h-8 gap-1.5 text-xs'
						onClick={onAddSort}
						disabled={!canAddSort}
					>
						<Plus className='h-3.5 w-3.5' />
						Add Sort
					</Button>
					<Button
						variant='ghost'
						size='sm'
						className='h-8 text-xs text-muted-foreground'
						onClick={onResetSorting}
						disabled={activeCount === 0}
					>
						Reset Sorting
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}
