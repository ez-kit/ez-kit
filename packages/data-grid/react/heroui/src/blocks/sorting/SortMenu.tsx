'use client'

import { DataGridSortItem } from '@ez-kit/data-grid-react'
import {
	SORT_DRAGGING_SELECTOR,
	SortDirection,
	useGridMessages,
	StepSide,
	useSortDragKeyboardGuard,
	useStepFocus,
} from '@ez-kit/data-grid-react/kit'
import { Button, buttonVariants, ListBox, Popover, Select } from '@heroui/react'
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { KIT_CLASS_NAME } from '../../lib/kit-class-name'

import type { StepFocus, SortItemRenderProps, SortMenuItem, SortMenuProps } from '@ez-kit/data-grid-react'

type SortGripRef = NonNullable<SortItemRenderProps['handleProps']>['ref']

/**
 * The grip an entry is dragged by — rendered only when the builder hands one over. Named for the
 * entry, so a screen reader does not read a list of identical grips; the glyph and the cursor are
 * the column grip's. `touch-none` is not decoration: without it a touch drag scrolls the popover.
 */
function SortGrip({ handleRef, label }: { handleRef: SortGripRef; label: string }) {
	const messages = useGridMessages()
	return (
		<Button
			ref={handleRef}
			isIconOnly
			aria-label={messages.sorting.dragSort({ label })}
			aria-roledescription={messages.ordering.draggable}
			data-slot='sort-drag-handle'
			size='sm'
			variant='ghost'
		>
			<GripVertical
				aria-hidden='true'
				className='size-4 cursor-grab touch-none select-none active:cursor-grabbing'
			/>
		</Button>
	)
}

/**
 * The step pair, drawn as arrows along the list: the first entry is the highest priority and sits
 * at the top, so up raises an entry and down lowers it.
 */
function SortMoveControls({ item, keep }: { item: SortMenuItem; keep: StepFocus['keep'] }) {
	const messages = useGridMessages()
	const ordering = item.ordering
	if (!ordering) return null
	return (
		<>
			<Button
				aria-label={messages.sorting.moveUp({ label: item.label })}
				data-slot='sort-move-start'
				isDisabled={!ordering.canMoveStart}
				isIconOnly
				size='sm'
				variant='ghost'
				onPress={() => {
					keep(item.columnId, StepSide.Start)
					ordering.onMoveStart()
				}}
			>
				<ArrowUp className='size-4' />
			</Button>
			<Button
				aria-label={messages.sorting.moveDown({ label: item.label })}
				data-slot='sort-move-end'
				isDisabled={!ordering.canMoveEnd}
				isIconOnly
				size='sm'
				variant='ghost'
				onPress={() => {
					keep(item.columnId, StepSide.End)
					ordering.onMoveEnd()
				}}
			>
				<ArrowDown className='size-4' />
			</Button>
		</>
	)
}

/**
 * One entry of the builder, rendered through `<DataGridSortItem>`'s render function: the row element
 * is this kit's, and the shared component decides whether it registers with the drag adapter and
 * hands over the grip's activator when it does.
 */
function SortRow({ item, index, keep }: { item: SortMenuItem; index: number; keep: StepFocus['keep'] }) {
	const messages = useGridMessages()
	return (
		<DataGridSortItem sortId={item.columnId}>
			{({ itemProps, handleProps }) => (
				<div
					{...itemProps}
					className='flex items-center gap-2'
				>
					{handleProps && (
						<SortGrip
							handleRef={handleProps.ref}
							label={item.label}
						/>
					)}
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
							<Select.Popover className={KIT_CLASS_NAME}>
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
							<Select.Popover className={KIT_CLASS_NAME}>
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
					<SortMoveControls
						item={item}
						keep={keep}
					/>
				</div>
			)}
		</DataGridSortItem>
	)
}

export function SortMenu({ items, canAddSort, onAddSort, onResetSorting }: SortMenuProps) {
	const messages = useGridMessages()
	const activeCount = items.length
	/*
	 * During a keyboard drag of an entry the arrows and `Space` belong to the drag, not to the
	 * entry's selects or the dialog — the same guard the column panel uses.
	 */
	const guardRef = useSortDragKeyboardGuard()
	/*
	 * A step moves the row or disables the pressed button, and either drops keyboard focus; this puts
	 * it back on the pair once the list has re-rendered.
	 */
	const { ref: stepFocusRef, keep: keepStepFocus } = useStepFocus({ start: 'sort-move-start', end: 'sort-move-end' })
	const listNodeRef = useRef<HTMLDivElement | null>(null)
	const listRef = useCallback(
		(node: HTMLDivElement | null) => {
			listNodeRef.current = node
			guardRef(node)
			stepFocusRef(node)
		},
		[guardRef, stepFocusRef],
	)
	/*
	 * Controlled so that a close can be refused: during a keyboard drag `Escape` cancels the drag — the
	 * guard lets it through for that — and must not also close the builder under the user's hands.
	 */
	const [isOpen, setIsOpen] = useState(false)
	const onOpenChange = (open: boolean) => {
		if (!open && listNodeRef.current?.querySelector(SORT_DRAGGING_SELECTOR)) return
		setIsOpen(open)
	}

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={onOpenChange}
		>
			{/* No `<Button>` in here: `Popover.Trigger` renders its own `div[role="button"]` around
			    whatever it is given, so a button inside it is `nested-interactive`. The looks come
			    from `buttonVariants`, plus `inline-flex` to beat `popover__trigger`'s `inline-block` —
			    see `VisibilityMenu` for the full note. */}
			<Popover.Trigger
				data-slot='sort-menu-trigger'
				className={`${buttonVariants({ size: 'sm', variant: 'outline' })} inline-flex`}
			>
				<ArrowUpDown size={16} />
				{messages.sorting.trigger}
				{activeCount > 0 ? (
					<span className='ml-0.5 rounded-full bg-accent px-1.5 py-0 text-xs leading-5 font-medium text-accent-foreground'>
						{activeCount}
					</span>
				) : null}
			</Popover.Trigger>
			<Popover.Content className={KIT_CLASS_NAME}>
				<Popover.Dialog
					aria-label={messages.sorting.menu}
					data-slot='sort-menu'
					className='p-3'
				>
					<div className='min-w-[30rem] flex flex-col gap-3'>
						{activeCount === 0 ? (
							<p className='m-0 text-xs opacity-70'>{messages.sorting.empty}</p>
						) : (
							<div
								ref={listRef}
								className='flex flex-col gap-2'
							>
								{/*
								 * Keyed by the column alone, so an entry that moves keeps its row — a drag of it needs
								 * that, and a key carrying the index would remount the row it is holding. Picking another
								 * column for an entry still remounts it, as it always has.
								 */}
								{items.map((item, index) => (
									<SortRow
										key={item.columnId}
										item={item}
										index={index}
										keep={keepStepFocus}
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
