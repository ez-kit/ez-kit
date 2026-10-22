'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'

import { Badge } from '@grid-shadcn/components/ui/badge'

import { itemOf, PendingLabel, SelectCellInput, UnlabelledValue } from './SelectCell'

import type {
	BadgeCellConfig,
	BadgeColumnConfig,
	BadgeItem,
	CellTypeDefinition,
	CellViewProps,
	FieldState,
} from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

function BadgeCellView({ value, config, item, itemStatus }: CellViewProps<BadgeCellConfig>) {
	if (itemStatus === 'pending') return <PendingLabel data-slot='badge-cell-skeleton' />
	const match = itemOf(value, item, config) as BadgeItem | undefined

	if (!match) {
		return (
			<Badge>
				<UnlabelledValue
					value={value}
					failed={itemStatus === 'error'}
				/>
			</Badge>
		)
	}

	return (
		<Badge variant={match.variant ?? 'default'}>
			{(match.icon as ReactNode) ?? null}
			{match.label}
		</Badge>
	)
}

// Badge edit/filter UX is identical to Select — same compound, same payload.
function BadgeCellInput(props: FieldState<BadgeCellConfig>) {
	return <SelectCellInput {...props} />
}

/**
 * This kit's `badge` registry entry — importable on its own, so a consumer can register only the
 * cell types it uses. `blocks/cell-types.ts` composes the default registry from these.
 *
 * Annotated rather than inferred, and restating the phantom `__config` the spread carries: see
 * the note on `KitCellTypes` in `../cell-types.ts` for what an inferred type does to the
 * bundled declarations.
 */
const badgeCellType: CellTypeDefinition<BadgeCellConfig> & { __config?: BadgeColumnConfig } = {
	...baseCellTypes.badge,
	view: BadgeCellView,
	editing: BadgeCellInput,
	filtering: BadgeCellInput,
}

export { BadgeCellInput, badgeCellType, BadgeCellView }
