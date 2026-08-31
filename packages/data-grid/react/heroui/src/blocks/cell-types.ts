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
		editing: TextCellInput,
		filtering: TextCellInput,
	},
	number: {
		...baseCellTypes.number,
		editing: NumberCellInput,
		filtering: NumberCellInput,
	},
	boolean: {
		...baseCellTypes.boolean,
		view: BooleanCellView,
		editing: BooleanCellInput,
		filtering: BooleanFilterInput,
	},
	date: {
		...baseCellTypes.date,
		view: DateCellView,
		editing: DateCellInput,
		filtering: DateCellInput,
	},
	select: { ...baseCellTypes.select, view: SelectCellView, editing: SelectCellInput, filtering: SelectCellInput },
	badge: { ...baseCellTypes.badge, view: BadgeCellView, editing: BadgeCellInput, filtering: BadgeCellInput },
	image: { ...baseCellTypes.image, view: ImageCellView, editing: ImageCellInput },
	link: { ...baseCellTypes.link, view: LinkCellView, editing: LinkCellInput },
	progress: { ...baseCellTypes.progress, view: ProgressCellView, editing: ProgressCellInput },
} satisfies CellTypeRegistry
