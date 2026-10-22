'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
import { useGridMessages } from '@ez-kit/data-grid-react/kit'

import { Field, FieldDescription, FieldError, FieldLabel } from '@grid-shadcn/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@grid-shadcn/components/ui/select'
import { Skeleton } from '@grid-shadcn/components/ui/skeleton'
import { KIT_CLASS_NAME } from '@grid-shadcn/lib/kit-class-name'

import { ListStateAnnouncer } from '../items-list-state'

import type {
	CellTypeDefinition,
	CellViewProps,
	FieldState,
	SelectCellConfig,
	SelectColumnConfig,
	SelectItem as SelectItemDef,
} from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

const ALL_SENTINEL = '__all__'

/**
 * The item a cell's value resolved to: the grid's `item`, else a lookup in `config.items` — which a
 * view rendered outside the grid's own cells (a custom layout, a test) still receives alone.
 */
function itemOf(value: unknown, item: SelectItemDef | undefined, config: SelectCellConfig | undefined) {
	return item ?? config?.items.find((candidate) => candidate.value === String(value ?? ''))
}

/** A label still on its way from a `useItems` hook. Sized like one, so the row does not jump. */
function PendingLabel({ 'data-slot': slot }: { 'data-slot': string }) {
	const messages = useGridMessages()
	return (
		<span
			data-slot={slot}
			className='inline-flex'
		>
			<Skeleton
				aria-hidden
				className='h-4 w-16'
			/>
			<span className='sr-only'>{messages.fallbacks.loading}</span>
		</span>
	)
}

/**
 * A value with no label: the raw value. When the list that should have labelled it **failed**, it
 * says so — muted, and named by the failure in its tooltip and accessible description — so a raw
 * id there is not mistaken for data.
 */
function UnlabelledValue({ value, failed }: { value: unknown; failed: boolean }) {
	const messages = useGridMessages()
	const raw = String(value ?? '')
	if (!failed) return <>{raw}</>
	return (
		<span
			data-item-status='error'
			title={messages.filtering.itemsError}
			className='text-muted-foreground'
		>
			{raw}
		</span>
	)
}

function SelectCellView({ value, config, item, itemStatus }: CellViewProps<SelectCellConfig>) {
	if (itemStatus === 'pending') return <PendingLabel data-slot='select-cell-skeleton' />
	const match = itemOf(value, item, config)
	if (!match)
		return (
			<UnlabelledValue
				value={value}
				failed={itemStatus === 'error'}
			/>
		)
	return (
		<span
			data-slot='select-cell-value'
			className='inline-flex items-center gap-1.5 whitespace-nowrap'
		>
			{(match.icon as ReactNode) ?? null}
			{match.label}
		</span>
	)
}

/**
 * Select cell input. Wraps shadcn Field/Select; renders `<FieldLabel>` only
 * when `field.label` is provided.
 */
function SelectCellInput({
	id,
	value,
	onChange,
	onBlur,
	config,
	label,
	description,
	errors,
	item,
	itemsLoading,
	itemsError,
}: FieldState<SelectCellConfig>) {
	const messages = useGridMessages()
	const hasError = errors.length > 0
	const items = config?.items ?? []
	const selectValue = value != null && value !== '' ? String(value) : ALL_SENTINEL
	// The trigger names the current value from the column's base list, which may hold a value this
	// field no longer offers (an archived warehouse). Radix would show nothing for it.
	const currentItem = selectValue === ALL_SENTINEL ? undefined : itemOf(value, item, config)
	// Said on the trigger, not in the list: Radix renders the content as a listbox, which may hold
	// only options.
	const emptyListLabel =
		items.length > 0
			? undefined
			: itemsLoading === true
				? messages.fallbacks.loading
				: itemsError !== undefined
					? messages.filtering.itemsError
					: undefined
	return (
		<Field data-error={hasError || undefined}>
			{label !== undefined && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
			<Select
				value={selectValue}
				onValueChange={(v) => {
					onChange(v === ALL_SENTINEL ? undefined : v)
				}}
			>
				<SelectTrigger
					id={id}
					onBlur={onBlur}
					aria-invalid={hasError || undefined}
				>
					<SelectValue placeholder={messages.cells.all}>
						{currentItem ? (
							<>
								{(currentItem.icon as ReactNode) ?? null}
								{currentItem.label}
							</>
						) : emptyListLabel !== undefined ? (
							<span data-slot='select-items-state'>{emptyListLabel}</span>
						) : undefined}
					</SelectValue>
				</SelectTrigger>
				<SelectContent className={KIT_CLASS_NAME}>
					<SelectItem value={ALL_SENTINEL}>{messages.cells.all}</SelectItem>
					{items.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
						>
							{(option.icon as ReactNode) ?? null}
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<ListStateAnnouncer
				isLoading={itemsLoading === true}
				error={itemsError}
			/>
			{description !== undefined && <FieldDescription>{description}</FieldDescription>}
			{hasError && <FieldError errors={errors.map((message) => ({ message }))} />}
		</Field>
	)
}

/**
 * This kit's `select` registry entry — importable on its own, so a consumer can register only the
 * cell types it uses. `blocks/cell-types.ts` composes the default registry from these.
 *
 * Annotated rather than inferred, and restating the phantom `__config` the spread carries: see
 * the note on `KitCellTypes` in `../cell-types.ts` for what an inferred type does to the
 * bundled declarations.
 */
const selectCellType: CellTypeDefinition<SelectCellConfig> & { __config?: SelectColumnConfig } = {
	...baseCellTypes.select,
	view: SelectCellView,
	editing: SelectCellInput,
	filtering: SelectCellInput,
}

export { itemOf, PendingLabel, UnlabelledValue, SelectCellInput, selectCellType, SelectCellView }
