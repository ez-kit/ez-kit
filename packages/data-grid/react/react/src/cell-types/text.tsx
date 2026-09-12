import { defineCellType } from '../cell-types-context'
import { useGridComponents } from '../components-context'

import type { TextCellConfig, FieldState } from '@ez-kit/data-grid-core'
import type { ChangeEvent, ReactNode } from 'react'

/** Pure formatter used by the view renderer. Exposed for testing. */
export function truncateText(value: string, config?: TextCellConfig): string {
	if (config?.maxLength === undefined || value.length <= config.maxLength) return value
	const ellipsis = config.ellipsis
	const marker = ellipsis === false ? '' : typeof ellipsis === 'string' ? ellipsis : '…'
	return value.slice(0, config.maxLength) + marker
}

function TextCellInput(props: FieldState<TextCellConfig>): ReactNode {
	const { Input } = useGridComponents().core
	return (
		<Input
			value={(props.value ?? '') as string | number | readonly string[]}
			onChange={(e: ChangeEvent<HTMLInputElement>) => {
				props.onChange(e.target.value)
			}}
			onBlur={props.onBlur}
		/>
	)
}

/**
 * Shared `text` cell type.
 *
 * - `view`: stringifies the value and optionally truncates with an ellipsis.
 * - `editing` / `filtering`: thin wrapper over `useGridComponents().core.Input`.
 *
 * No `creating` slot: a create form resolves `creating ?? editing`, so registering the same
 * component twice would only shadow a UI kit's own `editing` override in create mode — the
 * defect that gave HeroUI a bare `<input>` in the draft row and a `TextField` in the edit row.
 *
 * Zero visual choices — only data transforms. UI primitive comes from DI.
 */
export const textCellType = defineCellType<TextCellConfig>()({
	view: ({ value, config }) => truncateText(String(value ?? ''), config),
	editing: TextCellInput,
	filtering: TextCellInput,
})
