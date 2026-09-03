import { Collection, ComboBox, Input, ListBox, Spinner } from '@heroui/react'

import { FieldDescription, FieldErrorText, FieldLabel } from './field-chrome'
import { fieldRoot } from './field-state'

import type { SelectFieldRenderProps } from '@ez-kit/form-react'
import type { Key } from '@heroui/react'
import type { ReactNode } from 'react'

/** What React Aria's collection needs per row: an `id` it can key and select by. */
type ComboItem = { id: string; label: string; disabled: boolean | undefined }

/** React Aria reports "nothing selected" as `null`; the contract's value type is a string. */
function toStringValue(key: Key | Key[] | null): string {
	if (key === null || Array.isArray(key)) {
		return ''
	}

	return String(key)
}

/**
 * The searchable flavour of {@link SelectField} — HeroUI's React Aria combo box.
 *
 * Three things make it work against a server-side search, and all three are easy to get
 * subtly wrong:
 *
 * 1. **`items` is passed to the root.** With static children (or `defaultItems`) React Aria
 *    filters the collection itself against the typed text. Here the filtering already happened
 *    on the server, and a second client-side pass would hide rows the search deliberately
 *    returned. Handing the collection in as `items` is what turns React Aria's own filter off.
 * 2. **`inputValue` is left uncontrolled.** React Aria then owns the input's text, which is
 *    what makes the *selected* option's label appear on mount without anyone assigning it —
 *    and the label is there to be found because the renderer merged the selected option into
 *    `options` from a second query. Only the query is reported upward, via `onInputChange`.
 * 3. **`loading` does not disable the control.** For a plain select it does: an empty list you
 *    cannot choose from should not be interactive. A searchable one is loading almost every
 *    time the user types, and freezing the input mid-word would make it unusable — so the
 *    state shows in the popover instead.
 */
export function SearchableSelectField({
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
}: SelectFieldRenderProps & { search: NonNullable<SelectFieldRenderProps['search']> }): ReactNode {
	const items: ComboItem[] = options.map((option) => ({
		id: option.value,
		label: option.label,
		disabled: option.disabled,
	}))
	const disabledKeys = items.filter((item) => item.disabled === true).map((item) => item.id)

	return (
		<ComboBox
			// Without it the popover closes the moment a query returns nothing, taking the
			// "Searching…"/"No matches" message with it — the two states a search most needs to show.
			allowsEmptyCollection
			items={items}
			value={value === '' ? null : value}
			onChange={(next) => {
				onChange(toStringValue(next))
			}}
			onInputChange={search.onQueryChange}
			name={name}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<ComboBox.InputGroup>
				<Input
					id={id}
					onBlur={onBlur}
					{...(placeholder !== undefined ? { placeholder } : {})}
				/>
				<ComboBox.Trigger />
			</ComboBox.InputGroup>
			<ComboBox.Popover>
				<ListBox
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
		</ComboBox>
	)
}
