import { baseCellTypes } from '@ez-kit/data-grid-react'

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

export const cellTypes = {
	text: {
		...baseCellTypes.text,
		edit: TextCellInput,
		creating: TextCellInput,
		filter: TextCellInput,
	},
	number: {
		...baseCellTypes.number,
		edit: NumberCellInput,
		creating: NumberCellInput,
		filter: NumberCellInput,
	},
	boolean: {
		...baseCellTypes.boolean,
		view: BooleanCellView,
		edit: BooleanCellInput,
		creating: BooleanCellInput,
		filter: BooleanFilterInput,
	},
	date: {
		...baseCellTypes.date,
		view: DateCellView,
		edit: DateCellInput,
		creating: DateCellInput,
		filter: DateCellInput,
	},
	select: { ...baseCellTypes.select, view: SelectCellView, edit: SelectCellInput, filter: SelectCellInput },
	badge: { ...baseCellTypes.badge, view: BadgeCellView, edit: BadgeCellInput, filter: BadgeCellInput },
	image: { ...baseCellTypes.image, view: ImageCellView, edit: ImageCellInput },
	link: { ...baseCellTypes.link, view: LinkCellView, edit: LinkCellInput },
	progress: { ...baseCellTypes.progress, view: ProgressCellView, edit: ProgressCellInput },
} satisfies CellTypeRegistry
