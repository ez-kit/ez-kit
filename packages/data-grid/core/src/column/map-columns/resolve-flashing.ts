import { DEFAULT_FLASH_DURATIONS } from '../../features/flashing/types'
import { featureConfig, isFeatureEnabled } from '../../utils/feature-flag'

import type {
	ColumnFlashingConfig,
	ColumnFlashingMeta,
	FlashingConfig,
	FlashingDurations,
	FlashingStatus,
} from '../../features/flashing/types'

/** The durations an object form names, without the keys it leaves out. */
function durationsOf(config: FlashingDurations): FlashingDurations {
	const durations: FlashingDurations = {}
	if (config.flashDuration !== undefined) durations.flashDuration = config.flashDuration
	if (config.fadeDuration !== undefined) durations.fadeDuration = config.fadeDuration
	return durations
}

/**
 * A column's resolved `flashing`, or `undefined` when the column does not flash on its own.
 *
 * The column wins in both directions, the way `filtering.faceted` does: `false` turns it off under
 * a grid that is on, `true` or an object turns it on under a grid that is off. Durations layer
 * defaults < grid object < column object, key by key, and `true` names none — the same rule the
 * option layers apply, where `true` over a config object keeps the object.
 */
export function resolveFlashing(
	column: boolean | ColumnFlashingConfig<never, never> | undefined,
	table: boolean | FlashingConfig | undefined,
): ColumnFlashingMeta | undefined {
	if (column === false) return undefined
	if (column === undefined && !isFeatureEnabled(table)) return undefined

	// Read through `featureConfig`, so a grid object switched off with `enabled: false` lends a
	// column that turns itself on no durations — the rule every feature option follows.
	const tableConfig = featureConfig(table)
	const tableDurations = tableConfig ? durationsOf(tableConfig) : {}
	const columnObject = typeof column === 'object' ? column : undefined
	const resolved: ColumnFlashingMeta = {
		...DEFAULT_FLASH_DURATIONS,
		...tableDurations,
		...(columnObject ? durationsOf(columnObject) : {}),
	}
	if (columnObject?.equals !== undefined) resolved.equals = columnObject.equals
	// Erased like `cellClassName`: the cell hands it the column's own value and row.
	if (columnObject?.status !== undefined) resolved.status = columnObject.status as FlashingStatus
	return resolved
}
