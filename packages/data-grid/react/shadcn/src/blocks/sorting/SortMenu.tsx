'use client'

import { DataGridSortItem } from '@ez-kit/data-grid-react'
import {
	SORT_DRAGGING_SELECTOR,
	useGridMessages,
	StepSide,
	useSortDragKeyboardGuard,
	useStepFocus,
} from '@ez-kit/data-grid-react/kit'
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useCallback, useRef } from 'react'

import { Button } from '@grid-shadcn/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@grid-shadcn/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@grid-shadcn/components/ui/select'
import { KIT_CLASS_NAME } from '@grid-shadcn/lib/kit-class-name'
import { cn } from '@grid-shadcn/lib/utils'

import type { StepFocus, SortDirection, SortMenuItem, SortMenuProps } from '@ez-kit/data-grid-react'

/**
 * The grip an entry is dragged by — rendered only when the builder hands one over.
 *
 * Named for the entry, so a screen reader does not read a list of identical grips. `touch-none` is
 * not decoration: without it a touch drag scrolls the popover instead of moving the entry.
 */
function SortGrip({ handleRef, label }: { handleRef: (node: HTMLElement | null) => void; label: string }) {
	const messages = useGridMessages()
	return (
		<Button
			ref={handleRef}
			aria-label={messages.sorting.dragSort({ label })}
			aria-roledescription={messages.ordering.draggable}
			className='size-6 shrink-0 text-muted-foreground'
			data-slot='sort-drag-handle'
			size='icon-xs'
			type='button'
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
				className='size-6 shrink-0'
				data-slot='sort-move-start'
				disabled={!ordering.canMoveStart}
				size='icon-xs'
				variant='ghost'
				onClick={() => {
					keep(item.columnId, StepSide.Start)
					ordering.onMoveStart()
				}}
			>
				<ArrowUp />
			</Button>
			<Button
				aria-label={messages.sorting.moveDown({ label: item.label })}
				className='size-6 shrink-0'
				data-slot='sort-move-end'
				disabled={!ordering.canMoveEnd}
				size='icon-xs'
				variant='ghost'
				onClick={() => {
					keep(item.columnId, StepSide.End)
					ordering.onMoveEnd()
				}}
			>
				<ArrowDown />
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
					className='flex items-center gap-1.5'
				>
					{handleProps && (
						<SortGrip
							handleRef={handleProps.ref}
							label={item.label}
						/>
					)}
					<span className='w-12 shrink-0 text-xs text-muted-foreground'>
						{index === 0 ? messages.sorting.sortBy : messages.sorting.thenBy}
					</span>

					<Select
						value={item.columnId}
						onValueChange={item.onChangeColumn}
					>
						<SelectTrigger
							className='h-8 flex-1 text-xs'
							aria-label={messages.sorting.menu}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent className={KIT_CLASS_NAME}>
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
							item.onChangeDirection(v as SortDirection)
						}}
					>
						<SelectTrigger
							className='h-8 w-[7.5rem] text-xs'
							aria-label={messages.sorting.direction}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent className={KIT_CLASS_NAME}>
							<SelectItem
								value='asc'
								className='text-xs'
							>
								{messages.sorting.ascending}
							</SelectItem>
							<SelectItem
								value='desc'
								className='text-xs'
							>
								{messages.sorting.descending}
							</SelectItem>
						</SelectContent>
					</Select>

					<Button
						variant='ghost'
						size='icon'
						className='h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive'
						onClick={item.onRemove}
						aria-label={messages.sorting.remove}
					>
						<Trash2 className='h-3.5 w-3.5' />
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
	 * entry's selects or the popover — the same guard the column panel uses.
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

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='h-8 gap-1.5'
					data-slot='sort-menu-trigger'
				>
					<ArrowUpDown className='h-4 w-4' />
					{messages.sorting.trigger}
					{activeCount > 0 ? (
						<span className='ml-0.5 rounded-full bg-primary px-1.5 py-0 text-xs leading-5 font-medium text-primary-foreground'>
							{activeCount}
						</span>
					) : null}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='end'
				aria-label={messages.sorting.menu}
				className={cn(KIT_CLASS_NAME, 'w-[26rem] p-3')}
				data-slot='sort-menu'
				onEscapeKeyDown={(event) => {
					/*
					 * During a keyboard drag `Escape` cancels the drag — the guard lets it through for
					 * that — and must not also close the builder under the user's hands.
					 */
					if (listNodeRef.current?.querySelector(SORT_DRAGGING_SELECTOR)) event.preventDefault()
				}}
			>
				{activeCount === 0 ? (
					<p className='mb-3 px-1 text-xs text-muted-foreground'>{messages.sorting.empty}</p>
				) : (
					<div
						ref={listRef}
						className='mb-3 space-y-2'
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

				<div className='flex items-center justify-between gap-2 border-t pt-3'>
					<Button
						variant='ghost'
						size='sm'
						className='h-8 gap-1.5 text-xs'
						onClick={onAddSort}
						disabled={!canAddSort}
					>
						<Plus className='h-3.5 w-3.5' />
						{messages.sorting.add}
					</Button>
					<Button
						variant='ghost'
						size='sm'
						className='h-8 text-xs text-muted-foreground'
						onClick={onResetSorting}
						disabled={activeCount === 0}
					>
						{messages.sorting.reset}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}
