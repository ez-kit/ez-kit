import { booleanCellType, numberCellType, textCellType } from '@ez-kit/data-grid-react/cell-types'

import { BadgeCellInput, BadgeCellView } from './cell-types/BadgeCell'
import { BooleanCellView, BooleanFilterInput } from './cell-types/BooleanCell'
import { DateCellInput, DateCellView } from './cell-types/DateCell'
import { ImageCellInput, ImageCellView } from './cell-types/ImageCell'
import { LinkCellInput, LinkCellView } from './cell-types/LinkCell'
import { ProgressCellInput, ProgressCellView } from './cell-types/ProgressCell'
import { SelectCellInput, SelectCellView } from './cell-types/SelectCell'

import type { CellTypeRegistry } from '@ez-kit/data-grid-react'

export const SHADCN_CELL_TYPES: CellTypeRegistry = {
	text: textCellType,
	number: numberCellType,
	boolean: {
		...booleanCellType,
		view: BooleanCellView,
		filter: BooleanFilterInput,
	},
	date: {
		view: DateCellView,
		edit: DateCellInput,
		creating: DateCellInput,
		filter: DateCellInput,
	},
	select: { view: SelectCellView, edit: SelectCellInput, filter: SelectCellInput },
	badge: { view: BadgeCellView, edit: BadgeCellInput, filter: BadgeCellInput },
	image: { view: ImageCellView, edit: ImageCellInput },
	link: { view: LinkCellView, edit: LinkCellInput },
	progress: { view: ProgressCellView, edit: ProgressCellInput },
}
