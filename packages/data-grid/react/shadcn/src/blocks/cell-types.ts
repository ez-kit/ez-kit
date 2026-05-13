import { booleanCellType, numberCellType, textCellType } from '@ez-kit/data-grid-react/cell-types'

import { BadgeCellInput, BadgeCellView } from './cell-types/BadgeCell'
import { BooleanCellInput, BooleanCellView, BooleanFilterInput } from './cell-types/BooleanCell'
import { DateCellInput, DateCellView } from './cell-types/DateCell'
import { ImageCellInput, ImageCellView } from './cell-types/ImageCell'
import { LinkCellInput, LinkCellView } from './cell-types/LinkCell'
import { NumberCellInput } from './cell-types/NumberCell'
import { ProgressCellInput, ProgressCellView } from './cell-types/ProgressCell'
import { SelectCellInput, SelectCellView } from './cell-types/SelectCell'
import { TextCellInput } from './cell-types/TextCell'

import type { CellTypeRegistry } from '@ez-kit/data-grid-react'

export const cellTypes: CellTypeRegistry = {
	text: {
		...textCellType,
		edit: TextCellInput,
		creating: TextCellInput,
		filter: TextCellInput,
	},
	number: {
		...numberCellType,
		edit: NumberCellInput,
		creating: NumberCellInput,
		filter: NumberCellInput,
	},
	boolean: {
		...booleanCellType,
		view: BooleanCellView,
		edit: BooleanCellInput,
		creating: BooleanCellInput,
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
