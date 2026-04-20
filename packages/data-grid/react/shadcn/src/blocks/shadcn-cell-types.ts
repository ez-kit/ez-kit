import { BadgeCellInput } from './cell-types/BadgeCellInput'
import { BadgeCellView } from './cell-types/BadgeCellView'
import { ImageCellInput } from './cell-types/ImageCellInput'
import { ImageCellView } from './cell-types/ImageCellView'
import { LinkCellInput } from './cell-types/LinkCellInput'
import { LinkCellView } from './cell-types/LinkCellView'
import { ProgressCellInput } from './cell-types/ProgressCellInput'
import { ProgressCellView } from './cell-types/ProgressCellView'
import { SelectCellInput } from './cell-types/SelectCellInput'
import { SelectCellView } from './cell-types/SelectCellView'

import type { CellTypeRegistry } from '@ez-kit/data-grid-react'

export const SHADCN_CELL_TYPES: CellTypeRegistry = {
	select: { view: SelectCellView, edit: SelectCellInput, filter: SelectCellInput },
	badge: { view: BadgeCellView, edit: BadgeCellInput, filter: BadgeCellInput },
	image: { view: ImageCellView, edit: ImageCellInput },
	link: { view: LinkCellView, edit: LinkCellInput },
	progress: { view: ProgressCellView, edit: ProgressCellInput },
}
