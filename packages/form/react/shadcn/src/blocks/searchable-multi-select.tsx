import { useCallback, useMemo } from 'react'

import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	useComboboxAnchor,
} from '@form-shadcn/components/ui/combobox'

import { FieldShell } from './field-shell'

import type { MultiSelectFieldRenderProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The searchable flavour of {@link MultiSelectField} — the same Base UI combobox the
 * single-value field uses, in its `multiple` mode.
 *
 * It inherits the three decisions documented on `SearchableSelectField` (`filter={null}`,
 * a controlled `inputValue`, and `loading` that does not disable the control) and adds two
 * of its own:
 *
 * 1. **The chips carry resolved labels, and that is the point.** With a server-side search
 *    the selected cities are usually absent from the current page of results, so the label
 *    for each one comes from the source's second query, merged into `options` by the
 *    renderer. Looking a chip's label up in `options` is therefore all this kit has to do —
 *    it never learns two queries exist. `?? item` keeps a raw id visible in the one case the
 *    source failed to resolve it, rather than drawing an empty chip over a value that will
 *    still be submitted.
 * 2. **The query is cleared once a selection lands.** The single-value field gets that for
 *    free (an empty query means "show the selected label"); here the input stays a pure
 *    search box, so it has to be reset explicitly — otherwise the term that produced the new
 *    chip would sit next to it and keep narrowing the next search. The heroui kit does the
 *    same, and the contract asks both to.
 *
 * `inputValue` is the query and nothing else, which also side-steps the identity trap that
 * forced the single-value field to control it: there is no selected item whose label Base UI
 * could re-sync into the input.
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
	disabled,
	required,
	...field
}: MultiSelectFieldRenderProps & { search: NonNullable<MultiSelectFieldRenderProps['search']> }): ReactNode {
	// The chips replace the input as the popup's anchor, so it spans the whole control.
	const anchor = useComboboxAnchor()

	const items: string[] = useMemo(() => options.map((option) => option.value), [options])
	const labels = useMemo(() => new Map(options.map((option) => [option.value, option.label])), [options])
	const disabledItems = useMemo(
		() => new Set(options.filter((option) => option.disabled === true).map((option) => option.value)),
		[options],
	)

	const itemToStringLabel = useCallback((item: string) => labels.get(item) ?? item, [labels])

	// Base UI hands back the complete new selection, which is exactly what the contract wants;
	// the query goes with it, so the next search starts from nothing.
	const handleValueChange = useCallback(
		(next: string[]) => {
			onChange([...next])
			search.onQueryChange('')
		},
		[onChange, search],
	)

	return (
		<FieldShell
			id={id}
			{...field}
		>
			{(binding) => (
				<>
					{/* The selection lives in the combobox, so a plain form submit would not see it. */}
					{value.map((entry) => (
						<input
							key={entry}
							type='hidden'
							name={name}
							value={entry}
						/>
					))}
					<Combobox
						multiple
						items={items}
						// See the doc comment: these results are already filtered, server-side.
						filter={null}
						itemToStringLabel={itemToStringLabel}
						value={[...value]}
						onValueChange={handleValueChange}
						inputValue={search.query}
						onInputValueChange={search.onQueryChange}
						// Spread rather than passed: under `exactOptionalPropertyTypes` an explicit
						// `undefined` is rejected, and "not disabled" has to mean the key is absent.
						{...(disabled !== undefined ? { disabled } : {})}
						{...(required !== undefined ? { required } : {})}
					>
						<ComboboxChips
							ref={anchor}
							aria-busy={loading || undefined}
							data-loading={loading || undefined}
						>
							{value.map((entry) => (
								<ComboboxChip key={entry}>{itemToStringLabel(entry)}</ComboboxChip>
							))}
							<ComboboxChipsInput
								id={id}
								aria-invalid={field.invalid}
								onBlur={onBlur}
								{...(placeholder !== undefined && value.length === 0 ? { placeholder } : {})}
								{...binding}
							/>
						</ComboboxChips>
						<ComboboxContent anchor={anchor}>
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
				</>
			)}
		</FieldShell>
	)
}
