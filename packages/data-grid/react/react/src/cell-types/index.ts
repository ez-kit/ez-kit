import { defineCellType } from '../cell-types-context'

import { booleanCellType } from './boolean'
import { numberCellType } from './number'
import { textCellType } from './text'

import type {
	BadgeCellConfig,
	DateCellConfig,
	ImageCellConfig,
	LinkCellConfig,
	ProgressCellConfig,
	SelectCellConfig,
} from '@ez-kit/data-grid-core'

export { numberCellType, formatNumber } from './number'
export { textCellType, truncateText } from './text'
export { booleanCellType } from './boolean'

/**
 * The shared cell configs. Declared in `@ez-kit/data-grid-core` alongside every other cell
 * config and re-exported here, so a kit reaches all nine from the module it already imports.
 */
export type {
	BadgeCellConfig,
	BooleanCellConfig,
	DateCellConfig,
	ImageCellConfig,
	LinkCellConfig,
	NumberCellConfig,
	ProgressCellConfig,
	SelectCellConfig,
	TextCellConfig,
} from '@ez-kit/data-grid-core'

/**
 * The cell types every kit is expected to offer, with the config each accepts.
 *
 * `text`, `number` and `boolean` arrive with renderers — they are pure data transforms over
 * DI primitives, so there is nothing kit-specific to decide. The other six declare **only
 * their config**: a date picker, a badge or a progress bar is a visual idiom that no shared
 * layer can render, so the kit supplies `view` / `edit` / `filter` by spreading:
 *
 * ```ts
 * export const cellTypes = {
 *   ...baseCellTypes,
 *   date: { ...baseCellTypes.date, view: DateCellView, editing: DateCellInput },
 * }
 * ```
 *
 * Spreading preserves the declared config, so a column of that type keeps requiring exactly
 * the `cell.config` the base declared — the kit chooses the pixels, not the contract.
 */
export const baseCellTypes = {
	text: textCellType,
	number: numberCellType,
	boolean: booleanCellType,
	date: defineCellType<DateCellConfig>()({}),
	select: defineCellType<SelectCellConfig>()({}),
	badge: defineCellType<BadgeCellConfig>()({}),
	image: defineCellType<ImageCellConfig>()({}),
	link: defineCellType<LinkCellConfig>()({}),
	progress: defineCellType<ProgressCellConfig>()({}),
}
