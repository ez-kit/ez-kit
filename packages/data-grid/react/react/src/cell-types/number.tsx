import { defineCellType } from '../cell-types-context'
import { useGridComponents } from '../components-context'

import type { NumberCellConfig, FieldState } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/** Pure formatter used by the view renderer. Exposed for testing. */
export function formatNumber(value: number, config?: NumberCellConfig): string {
	const opts: Intl.NumberFormatOptions = {}
	if (config?.decimals !== undefined) {
		opts.minimumFractionDigits = config.decimals
		opts.maximumFractionDigits = config.decimals
	}
	const fmt = new Intl.NumberFormat(config?.locale, opts)
	let body: string
	if (config?.thousandsSeparator !== undefined || config?.decimalSeparator !== undefined) {
		body = fmt
			.formatToParts(value)
			.map((part) => {
				if (part.type === 'group' && config.thousandsSeparator !== undefined) return config.thousandsSeparator
				if (part.type === 'decimal' && config.decimalSeparator !== undefined) return config.decimalSeparator
				return part.value
			})
			.join('')
	} else {
		body = fmt.format(value)
	}
	return `${config?.prefix ?? ''}${body}${config?.suffix ?? ''}`
}

function NumberCellInput(props: FieldState<NumberCellConfig>): ReactNode {
	const { NumberInput } = useGridComponents().core
	return (
		<NumberInput
			value={typeof props.value === 'number' ? props.value : undefined}
			onChange={(n) => {
				props.onChange(n)
			}}
			onBlur={props.onBlur}
		/>
	)
}

/**
 * Shared `number` cell type.
 *
 * - `view`: formats via {@link Intl.NumberFormat} with optional override of
 *   thousands/decimal separators, prefix, suffix, decimals, locale.
 * - `editing` / `creating` / `filtering`: thin wrapper over `useGridComponents().core.NumberInput`.
 *
 * Zero visual choices — formatting logic only. UI primitive comes from DI.
 */
export const numberCellType = defineCellType<NumberCellConfig>()({
	view: ({ value, config }) => {
		if (typeof value !== 'number' || Number.isNaN(value)) return value == null ? '' : String(value)
		return formatNumber(value, config)
	},
	editing: NumberCellInput,
	creating: NumberCellInput,
	filtering: NumberCellInput,
})
