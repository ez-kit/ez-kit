'use client'

import { SortDirection, useGridMessages } from '@ez-kit/data-grid-react'
import { Button, ListBox, Popover, Select } from '@heroui/react'
import { ArrowUpDown, Plus, Trash2 } from 'lucide-react'

import type { SortMenuItem, SortMenuProps } from '@ez-kit/data-grid-react'

function SortRow({ item, index }: { item: SortMenuItem; index: number }) {
	const messages = useGridMessages()
	return (
		<div
			data-slot='sort-row'
			className='flex items-center gap-2'
		>
			<span className='w-14 shrink-0 text-xs opacity-70'>
				{index === 0 ? messages.sorting.sortBy : messages.sorting.thenBy}
			</span>

			<div className='flex-1 min-w-0'>
				<Select
					value={item.columnId}
					aria-label={messages.sorting.menu}
					onChange={(value) => {
						if (value != null) item.onChangeColumn(String(value))
					}}
				>
					<Select.Trigger>
						<Select.Value />
						<Select.Indicator />
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
					aria-label={messages.sorting.direction}
					onChange={(value) => {
						if (value === SortDirection.Asc || value === SortDirection.Desc) item.onChangeDirection(value)
					}}
				>
					<Select.Trigger>
						<Select.Value />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Popover>
						<ListBox>
							<ListBox.Item
								id='asc'
								textValue={messages.sorting.ascending}
							>
								{messages.sorting.ascending}
							</ListBox.Item>
							<ListBox.Item
								id='desc'
								textValue={messages.sorting.descending}
							>
								{messages.sorting.descending}
							</ListBox.Item>
						</ListBox>
					</Select.Popover>
				</Select>
			</div>

			<Button
				isIconOnly
				variant='ghost'
				size='sm'
				aria-label={messages.sorting.remove}
				onPress={item.onRemove}
			>
				<Trash2 size={14} />
			</Button>
		</div>
	)
}

export function SortMenu({ items, canAddSort, onAddSort, onResetSorting }: SortMenuProps) {
	const messages = useGridMessages()
	const activeCount = items.length

	return (
		<Popover>
			<Popover.Trigger>
				<Button
					data-slot='sort-menu-trigger'
					size='sm'
					variant='outline'
				>
					<ArrowUpDown size={16} />
					{messages.sorting.trigger}
					{activeCount > 0 ? (
						<span className='ml-0.5 rounded-full bg-accent px-1.5 py-0 text-xs leading-5 font-medium text-accent-foreground'>
							{activeCount}
						</span>
					) : null}
				</Button>
			</Popover.Trigger>
			<Popover.Content>
				<Popover.Dialog
					aria-label={messages.sorting.menu}
					data-slot='sort-menu'
					className='p-3'
				>
					<div className='min-w-[26rem] flex flex-col gap-3'>
						{activeCount === 0 ? (
							<p className='m-0 text-xs opacity-70'>{messages.sorting.empty}</p>
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
								{messages.sorting.add}
							</Button>
							<Button
								variant='ghost'
								size='sm'
								onPress={onResetSorting}
								isDisabled={activeCount === 0}
							>
								{messages.sorting.reset}
							</Button>
						</div>
					</div>
				</Popover.Dialog>
			</Popover.Content>
		</Popover>
	)
}
