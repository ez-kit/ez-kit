import { useGridComponents } from '../components-context'
import { ROW_PINNING_KEY } from '../use-data-grid'

import { useTable } from './table-context'

import type { PinningConfig, RowPinningConfig } from '@ez-kit/data-grid-core'
import type { Row } from '@tanstack/table-core'

type RowPinCellProps = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	row: Row<any>
}

function resolveRowPinConfig(pinning: boolean | PinningConfig | undefined): RowPinningConfig | undefined {
	if (!pinning) return undefined
	if (pinning === true) return { top: true, bottom: true }
	const row = pinning.row
	if (!row) return undefined
	if (row === true) return { top: true, bottom: true }
	return row
}

/**
 * Renders the pin menu in the __row_pin__ column.
 * Reads the pinning config stored on the table instance via ROW_PINNING_KEY.
 */
export function RowPinCell({ row }: RowPinCellProps) {
	const table = useTable()
	const { RowPinMenu } = useGridComponents().pinning

	const rawPinning = (table as unknown as Record<symbol, unknown>)[ROW_PINNING_KEY] as
		| boolean
		| PinningConfig
		| undefined
	const pinningConfig = resolveRowPinConfig(rawPinning)

	return (
		<RowPinMenu
			isPinned={row.getIsPinned()}
			canPinTop={Boolean(pinningConfig?.top)}
			canPinBottom={Boolean(pinningConfig?.bottom)}
			onPinTop={() => {
				row.pin('top', false, false)
			}}
			onPinBottom={() => {
				row.pin('bottom', false, false)
			}}
			onUnpin={() => {
				row.pin(false, false, false)
			}}
		/>
	)
}
