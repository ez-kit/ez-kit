import { useCallback, useMemo } from 'react'

import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from '@form-shadcn/components/ui/combobox'

import { FieldShell } from './field-shell'

import type { SelectFieldRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The searchable flavour of {@link SelectField} — the Base UI combobox from the kit's own
 * `radix-nova` style.
 *
 * Four decisions carry the feature; the first three mirror one made in the heroui kit.
 *
 * 1. **`filter={null}`.** Base UI filters `items` against the typed text by default. Here the
 *    filtering already happened on the server, and a second client-side pass would hide rows
 *    the search deliberately returned — most visibly the selected option merged in from the
 *    source's second query, which rarely matches the current text at all. `null` turns it off.
 * 2. **`inputValue` is controlled**, and this one is the opposite of what the heroui kit does.
 *    Base UI re-syncs the input's text back to the selected item's label every time the `items`
 *    array changes identity — and with a server-side search that is on every response, so each
 *    result set would erase whatever the user had typed since. Passing `inputValue` switches
 *    that behaviour off (`hasInputValue` guards both re-sync effects), which leaves the kit
 *    with the job Base UI was doing: show the query, or the selected label when nothing has
 *    been typed. Which is the same "renderer owns the query" the contract already states.
 * 3. **`loading` does not disable the control.** A plain select disables itself while its list
 *    arrives; a searchable one is loading on nearly every keystroke, and freezing the input
 *    mid-word would make it unusable. The state shows in the popup instead.
 * 4. **Items are option-value strings, not `{ value, label }` objects**, with the label supplied
 *    through `itemToStringLabel`. Base UI compares the controlled `value` with `Object.is`, so
 *    an object rebuilt from a list that legitimately changes identity on every search would read
 *    as a brand-new selection. A string is equal to itself and cannot.
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
	disabled,
	required,
	...field
}: SelectFieldRenderProps & { search: NonNullable<SelectFieldRenderProps['search']> }): ReactNode {
	const items: string[] = useMemo(() => options.map((option) => option.value), [options])
	const labels = useMemo(() => new Map(options.map((option) => [option.value, option.label])), [options])
	const disabledItems = useMemo(
		() => new Set(options.filter((option) => option.disabled === true).map((option) => option.value)),
		[options],
	)

	// The one place the kit turns a value back into something a person reads. Base UI calls it
	// for the input's text, so the merged-in selected option is what makes it resolvable.
	const itemToStringLabel = useCallback((item: string) => labels.get(item) ?? item, [labels])

	// An empty query means the user has not narrowed anything, so the input shows what is
	// selected — which on mount is the whole point of the feature. `?? value` rather than `??
	// ''` keeps a raw id visible in the one case the source failed to resolve it, instead of
	// silently drawing an empty box over a value that will still be submitted.
	const selectedLabel = value === '' ? '' : (labels.get(value) ?? value)
	const inputValue = search.query === '' ? selectedLabel : search.query

	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<Combobox
					items={items}
					// See the doc comment: these results are already filtered, server-side.
					filter={null}
					itemToStringLabel={itemToStringLabel}
					value={value === '' ? null : value}
					onValueChange={(next) => {
						onChange(next ?? '')
					}}
					inputValue={inputValue}
					onInputValueChange={(next) => {
						// Picking an item makes Base UI write the item's label into the input. That is
						// not a search the user asked for, so it must not become the query — otherwise
						// selecting "Lisbon" would immediately fire a search for "Lisbon".
						search.onQueryChange(next === selectedLabel ? '' : next)
					}}
					name={name}
					// Spread rather than passed: under `exactOptionalPropertyTypes` an explicit
					// `undefined` is rejected, and "not disabled" has to mean the key is absent.
					{...(disabled !== undefined ? { disabled } : {})}
					{...(required !== undefined ? { required } : {})}
				>
					<ComboboxInput
						id={id}
						aria-invalid={field.invalid}
						aria-busy={loading || undefined}
						data-loading={loading || undefined}
						onBlur={onBlur}
						className='w-full'
						{...(placeholder !== undefined ? { placeholder } : {})}
						{...binding}
					/>
					<ComboboxContent>
						<ComboboxEmpty>{loading ? 'Searching…' : 'No matches'}</ComboboxEmpty>
						<ComboboxList>
							<ComboboxCollection>
								{(item: string) => (
									<ComboboxItem
										key={item}
										value={item}
										{...(disabledItems.has(item) ? { disabled: true } : {})}
									>
										{itemToStringLabel(item)}
									</ComboboxItem>
								)}
							</ComboboxCollection>
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			)}
		</FieldShell>
	)
}
