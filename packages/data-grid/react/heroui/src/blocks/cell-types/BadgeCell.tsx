'use client'

import { baseCellTypes } from '@ez-kit/data-grid-react/cell-types'
import { Chip } from '@heroui/react'

import { itemOf, PendingLabel, SelectCellInput, UnlabelledValue } from './SelectCell'

import type {
	BadgeCellConfig,
	BadgeColumnConfig,
	BadgeItem,
	BadgeVariant,
	CellTypeDefinition,
	CellViewProps,
	FieldState,
} from '@ez-kit/data-grid-react'
import type { ReactNode } from 'react'

function mapBadgeVariant(variant: BadgeVariant | undefined): 'primary' | 'secondary' | 'soft' | undefined {
	if (variant === 'outline') return 'soft'
	if (variant === 'secondary') return 'secondary'
	return 'primary'
}

function BadgeCellView({ value, config, item, itemStatus }: CellViewProps<BadgeCellConfig>) {
	if (itemStatus === 'pending') return <PendingLabel data-slot='badge-cell-skeleton' />
	const match = itemOf(value, item, config) as BadgeItem | undefined
	return (
		<Chip variant={mapBadgeVariant(match?.variant)}>
			{(match?.icon as ReactNode) ?? null}
			<Chip.Label>
				{match ? (
					match.label
				) : (
					<UnlabelledValue
						value={value}
						failed={itemStatus === 'error'}
					/>
				)}
			</Chip.Label>
		</Chip>
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
