import { Chip, CloseButton, Collection, ComboBox, Input, ListBox, Spinner } from '@heroui/react'

import { FieldDescription, FieldErrorText, FieldLabel } from './field-chrome'
import { fieldRoot } from './field-state'

import type { MultiSelectFieldRenderProps } from '@ez-kit/form-react'
import type { Key } from '@heroui/react'
import type { ComponentProps, ReactNode } from 'react'

/** What React Aria's collection needs per row: an `id` it can key and select by. */
type ComboItem = { id: string; label: string; disabled: boolean | undefined }

/** React Aria reports a selection as one key, a list of keys, or `null` for "nothing". */
function toValues(keys: Key | Key[] | null): string[] {
	if (keys === null) return []
	return (Array.isArray(keys) ? keys : [keys]).map(String)
}

/**
 * `ComboBox`, with the multiple-selection props HeroUI documents but does not type.
 *
 * React Aria's own `ComboBox` carries the selection mode as a second type parameter, and
 * HeroUI's wrapper (`ComboBoxRootProps<T> extends ComponentPropsWithRef<typeof
 * ComboBoxPrimitive<T>>`, as of `@heroui/react` 3.0.3) instantiates it at its `'single'`
 * default. So `selectionMode='multiple'` and an array `value` are compile errors even though
 * the component forwards both straight through and HeroUI's own docs show exactly this
 * composition. Rather than widening the whole call site to `any`, the gap is closed once,
 * here, with the multi-value shapes spelled out — the only two props that actually differ.
 */
type MultiComboBoxProps = Omit<ComponentProps<typeof ComboBox>, 'value' | 'onChange' | 'selectionMode'> & {
	selectionMode: 'multiple'
	value: Key[]
	onChange: (keys: Key | Key[] | null) => void
}

const MultiComboBox = ComboBox as unknown as (props: MultiComboBoxProps) => ReactNode

/**
 * The searchable flavour of {@link MultiSelectField} — HeroUI's React Aria combo box in
 * `selectionMode='multiple'`, with the selection drawn as chips beneath the input.
 *
 * It inherits two decisions from `SearchableSelectField` — `items` on the root and on the
 * `Collection` (which is what turns React Aria's own client-side filtering off, since these
 * results were already filtered server-side), and `loading` that does not disable the control
 * — and differs from it in two:
 *
 * 1. **The chips carry resolved labels, and that is the point.** With a server-side search
 *    the selected cities are usually absent from the current page of results, so each label
 *    comes from the source's second query, merged into `options` by the renderer. This kit
 *    just looks a chip's label up in `options` and never learns two queries exist. `?? entry`
 *    keeps a raw id visible in the one case the source failed to resolve it, rather than
 *    drawing an empty chip over a value that will still be submitted.
 * 2. **`inputValue` is controlled here, unlike in the single-value field.** There it is left
 *    to React Aria precisely so the *selected* option's label appears in the input; in
 *    multiple selection there is no single label to show — the chips carry them — so the
 *    input is a pure search box, and controlling it is what lets the query be cleared once a
 *    selection lands. Otherwise the term that produced the new chip would sit beside it and
 *    keep narrowing the next search. The shadcn kit does the same, and the contract asks both
 *    to.
 *
 * Each chip carries its own labelled remove button, so a selection can be dropped with the
 * keyboard as well as the mouse.
 */
export function SearchableMultiSelectField({
	value,
	onChange,
	options,
	loading,
	search,
	placeholder,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: MultiSelectFieldRenderProps & { search: NonNullable<MultiSelectFieldRenderProps['search']> }): ReactNode {
	const items: ComboItem[] = options.map((option) => ({
		id: option.value,
		label: option.label,
		disabled: option.disabled,
	}))
	const disabledKeys = items.filter((item) => item.disabled === true).map((item) => item.id)
	const labels = new Map(options.map((option) => [option.value, option.label]))
	const chips = value.map((entry) => ({ id: entry, label: labels.get(entry) ?? entry }))

	return (
		<MultiComboBox
			selectionMode='multiple'
			// Without it the popover closes the moment a query returns nothing, taking the
			// "Searching…"/"No matches" message with it — the two states a search most needs to show.
			allowsEmptyCollection
			items={items}
			// The contract's value is readonly; React Aria wants a plain array it can hold on to.
			value={[...value]}
			onChange={(next) => {
				onChange(toValues(next))
				// See the doc comment: the query belongs to the search that produced the chip.
				search.onQueryChange('')
			}}
			inputValue={search.query}
			onInputChange={search.onQueryChange}
			name={name}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<ComboBox.InputGroup>
				<Input
					id={id}
					onBlur={onBlur}
					{...(placeholder !== undefined && value.length === 0 ? { placeholder } : {})}
				/>
				<ComboBox.Trigger />
			</ComboBox.InputGroup>
			{/*
			 * `Chip`, not `TagGroup`. A tag group is React Aria's idiomatic removable-chip list,
			 * but it builds its own collection, and nested inside the combo box's collection
			 * builder the first chip to appear threw out of `useGridListItem` — its grid state
			 * was not there yet. `Chip` is a plain display component with no collection of its
			 * own, so it composes here safely; the remove control is a labelled button, which is
			 * what a screen reader needs from it either way.
			 */}
			{chips.length > 0 && (
				<div
					data-slot='selected-values'
					className='flex flex-wrap gap-1'
				>
					{chips.map((chip) => (
						<Chip key={chip.id}>
							<Chip.Label>{chip.label}</Chip.Label>
							<CloseButton
								// React Aria hands every `Button` beneath a combo box the trigger's slot
								// props — which silently renamed these three to "Show suggestions" and
								// left a screen reader with no way to tell one chip from another.
								// `slot={null}` is React Aria's own opt-out from that context.
								slot={null}
								aria-label={`Remove ${chip.label}`}
								onPress={() => {
									onChange(value.filter((entry) => entry !== chip.id))
								}}
							/>
						</Chip>
					))}
				</div>
			)}
			<ComboBox.Popover>
				<ListBox
					selectionMode='multiple'
					data-loading={loading || undefined}
					renderEmptyState={() =>
						loading ? (
							<div className='flex items-center justify-center gap-2 p-3'>
								<Spinner size='sm' />
								<span className='text-muted text-sm'>Searching…</span>
							</div>
						) : (
							<div className='text-muted p-3 text-sm'>No matches</div>
						)
					}
					{...(disabledKeys.length > 0 ? { disabledKeys } : {})}
				>
					<Collection items={items}>
						{(item: ComboItem) => (
							<ListBox.Item
								id={item.id}
								textValue={item.label}
							>
								{item.label}
								<ListBox.ItemIndicator />
							</ListBox.Item>
						)}
					</Collection>
				</ListBox>
			</ComboBox.Popover>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</MultiComboBox>
	)
}
