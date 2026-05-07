'use client'

import { Button, ListBox, Popover, Select } from '@heroui/react'
import { ArrowUpDown, Plus, Trash2 } from 'lucide-react'

import type { SortMenuItem, SortMenuProps } from '@ez-kit/data-grid-react'

function SortRow({ item, index }: { item: SortMenuItem; index: number }) {
	return (
		<div
			data-slot='sort-row'
			style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
		>
			<span style={{ width: '3.5rem', flexShrink: 0, fontSize: '0.75rem', opacity: 0.7 }}>
				{index === 0 ? 'sort by' : 'then by'}
			</span>

			<div style={{ flex: 1, minWidth: 0 }}>
				<Select
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					selectedKey={item.columnId}
					aria-label='Sort column'
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					onSelectionChange={(key) => {
						if (key != null) item.onChangeColumn(String(key))
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

			<div style={{ width: '7.5rem', flexShrink: 0 }}>
				<Select
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					selectedKey={item.direction}
					aria-label='Sort direction'
					// eslint-disable-next-line @typescript-eslint/no-deprecated
					onSelectionChange={(key) => {
						if (key === 'asc' || key === 'desc') item.onChangeDirection(key)
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
					style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
				>
					<ArrowUpDown size={16} />
					Sort
					{activeCount > 0 ? (
						<span
							style={{
								marginLeft: '0.125rem',
								borderRadius: '9999px',
								padding: '0 0.375rem',
								fontSize: '0.75rem',
								fontWeight: 500,
								background: 'currentColor',
								color: 'transparent',
								backgroundClip: 'padding-box',
								opacity: 0.85,
							}}
						>
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
					<div style={{ minWidth: '26rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>
						{activeCount === 0 ? (
							<p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7 }}>
								No sorts applied. Add one to start sorting.
							</p>
						) : (
							<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
								{items.map((item, index) => (
									<SortRow
										key={`${String(index)}-${item.columnId}`}
										item={item}
										index={index}
									/>
								))}
							</div>
						)}

						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: '0.5rem',
								borderTop: '1px solid hsl(var(--heroui-default-200))',
								paddingTop: '0.75rem',
							}}
						>
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
