'use client'

import { Button, ListBox, Popover, Select } from '@heroui/react'
import { ArrowUpDown, Plus, Trash2 } from 'lucide-react'

import type { SortMenuItem, SortMenuProps } from '@ez-kit/data-grid-react'

function SortRow({ item, index }: { item: SortMenuItem; index: number }) {
	return (
		<div
			data-slot='sort-row'
			className='flex items-center gap-2'
		>
			<span className='w-14 shrink-0 text-xs opacity-70'>{index === 0 ? 'sort by' : 'then by'}</span>

			<div className='flex-1 min-w-0'>
				<Select
					value={item.columnId}
					aria-label='Sort column'
					onChange={(value) => {
						if (value != null) item.onChangeColumn(String(value))
					}}
				>
					<Select.Trigger>
						<Select.Value />
					</Select.Trigger>
					<Select.Popover>
						<ListBox>
							{item.availableColumns.map((col) => (
								<ListBox.Item
									key={col.id}
									id={col.id}
									textValue={col.label}
								>
									{col.label}
								</ListBox.Item>
							))}
						</ListBox>
					</Select.Popover>
				</Select>
			</div>

			<div className='w-[7.5rem] shrink-0'>
				<Select
					value={item.direction}
					aria-label='Sort direction'
					onChange={(value) => {
						if (value === 'asc' || value === 'desc') item.onChangeDirection(value)
					}}
				>
					<Select.Trigger>
						<Select.Value />
					</Select.Trigger>
					<Select.Popover>
						<ListBox>
							<ListBox.Item
								id='asc'
								textValue='Ascending'
							>
								Ascending
							</ListBox.Item>
							<ListBox.Item
								id='desc'
								textValue='Descending'
							>
								Descending
							</ListBox.Item>
						</ListBox>
					</Select.Popover>
				</Select>
			</div>

			<Button
				isIconOnly
				variant='ghost'
				size='sm'
				aria-label='Remove sort'
				onPress={item.onRemove}
			>
				<Trash2 size={14} />
			</Button>
		</div>
	)
}

export function SortMenu({ items, canAddSort, onAddSort, onResetSorting }: SortMenuProps) {
	const activeCount = items.length

	return (
		<Popover>
			<Popover.Trigger>
				<span
					data-slot='sort-trigger'
					className='inline-flex items-center gap-1.5'
				>
					<ArrowUpDown size={16} />
					Sort
					{activeCount > 0 ? (
						<span className='ml-0.5 rounded-full bg-accent px-1.5 py-0 text-xs leading-5 font-medium text-accent-foreground'>
							{activeCount}
						</span>
					) : null}
				</span>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Dialog
					aria-label='Sort'
					data-slot='sort-menu'
				>
					<div className='min-w-[26rem] flex flex-col gap-3 p-3'>
						{activeCount === 0 ? (
							<p className='m-0 text-xs opacity-70'>No sorts applied. Add one to start sorting.</p>
						) : (
							<div className='flex flex-col gap-2'>
								{items.map((item, index) => (
									<SortRow
										key={`${String(index)}-${item.columnId}`}
										item={item}
										index={index}
									/>
								))}
							</div>
						)}

						<div className='dg-sort-menu-footer flex items-center justify-between gap-2 pt-3'>
							<Button
								variant='ghost'
								size='sm'
								onPress={onAddSort}
								isDisabled={!canAddSort}
							>
								<Plus size={14} />
								Add Sort
							</Button>
							<Button
								variant='ghost'
								size='sm'
								onPress={onResetSorting}
								isDisabled={activeCount === 0}
							>
								Reset Sorting
							</Button>
						</div>
					</div>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
