import { useGridComponents } from '../components-context'

import type { CellTypeDefinition } from '../cell-types-context'
import type { FieldState } from '@ez-kit/data-grid-core'
import type { ChangeEvent, ReactNode } from 'react'

export type TextCellConfig = {
	/** Maximum character count for the rendered view. Longer values are truncated. */
	maxLength?: number
	/**
	 * Suffix appended when truncated.
	 * - `true` (default when `maxLength` set) → `'…'`
	 * - `false` → no marker
	 * - `string` → custom marker (e.g. `'...'`, `' ›'`)
	 */
	ellipsis?: boolean | string
}

/** Pure formatter used by the view renderer. Exposed for testing. */
export function truncateText(value: string, config?: TextCellConfig): string {
	if (config?.maxLength === undefined || value.length <= config.maxLength) return value
	const ellipsis = config.ellipsis
	const marker = ellipsis === false ? '' : typeof ellipsis === 'string' ? ellipsis : '…'
	return value.slice(0, config.maxLength) + marker
}

function TextCellInput(props: FieldState<TextCellConfig>): ReactNode {
	const { Input } = useGridComponents()
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
export const textCellType: CellTypeDefinition<TextCellConfig> = {
	view: ({ value, config }) => truncateText(String(value ?? ''), config),
	edit: TextCellInput,
	creating: TextCellInput,
	filter: TextCellInput,
}
