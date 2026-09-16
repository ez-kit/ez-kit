'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
import { useGridMessages } from '@ez-kit/data-grid-react/kit'
import { Description, FieldError, Label, ListBox, Select } from '@heroui/react'

import type { CellTypeDefinition, CellViewProps, FieldState, SelectCellConfig } from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

const ALL_SENTINEL = '__all__'

function SelectCellView({ value, config }: CellViewProps<SelectCellConfig>) {
	const items = config?.items ?? []
	const match = items.find((item) => item.value === String(value ?? ''))
	if (!match) return <>{String(value ?? '')}</>
	return (
		<span data-slot='select-cell-value'>
			{(match.icon as ReactNode) ?? null}
			{match.label}
		</span>
	)
}

/**
 * Select / Badge cell input on HeroUI v3. Wraps `<Select>` (always rendered);
 * Label/Description/FieldError appear only when their data is set.
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
}: FieldState<SelectCellConfig>) {
	const messages = useGridMessages()
	const hasError = errors.length > 0
	const items = config?.items ?? []
	const selectValue = value != null && value !== '' ? String(value) : ALL_SENTINEL
	return (
		<Select
			value={selectValue}
			isInvalid={hasError}
			aria-label={label ?? 'Select value'}
			onChange={(key) => {
				if (key == null || Array.isArray(key)) return
				onChange(String(key) === ALL_SENTINEL ? undefined : String(key))
			}}
			onBlur={onBlur}
		>
			{label !== undefined && <Label htmlFor={id}>{label}</Label>}
			<Select.Trigger id={id}>
				<Select.Value />
				<Select.Indicator />
			</Select.Trigger>
			<Select.Popover>
				<ListBox>
					<ListBox.Item
						id={ALL_SENTINEL}
						textValue={messages.cells.all}
					>
						{messages.cells.all}
					</ListBox.Item>
					{items.map((item) => (
						<ListBox.Item
							key={item.value}
							id={item.value}
							textValue={item.label}
						>
							{(item.icon as ReactNode) ?? null}
							{item.label}
						</ListBox.Item>
					))}
				</ListBox>
			</Select.Popover>
			{description !== undefined && <Description>{description}</Description>}
			{hasError && <FieldError>{errors[0]}</FieldError>}
		</Select>
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
const selectCellType: CellTypeDefinition<SelectCellConfig> & { __config?: SelectCellConfig } = {
	...baseCellTypes.select,
	view: SelectCellView,
	editing: SelectCellInput,
	filtering: SelectCellInput,
}

export { SelectCellInput, selectCellType, SelectCellView }
