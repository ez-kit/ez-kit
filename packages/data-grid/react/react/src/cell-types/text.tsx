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
 * - `edit` / `creating` / `filter`: thin wrapper over `useGridComponents().Input`.
 *
 * Zero visual choices — only data transforms. UI primitive comes from DI.
 */
export const textCellType = defineCellType<TextCellConfig>()({
	view: ({ value, config }) => truncateText(String(value ?? ''), config),
	edit: TextCellInput,
	creating: TextCellInput,
	filter: TextCellInput,
})
