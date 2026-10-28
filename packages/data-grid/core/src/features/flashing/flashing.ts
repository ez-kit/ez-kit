import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'

import { assignTableInstanceData } from '../../feature-state'

import type { FlashCellsParams, FlashRequest, FlashRequestSource } from './request-source'
import type { FlashingConfig } from './types'
import type { AnyTable } from '../../feature-state'
import type { RowData, TableFeature, TableFeatures } from '@tanstack/table-core'

export * from './types'
export * from './request-source'

declare module '@tanstack/table-core' {
	// Declaration merging needs interfaces; these are the shapes upstream declares as such.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Plugins {
		cellFlashingFeature: TableFeature
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface TableOptions_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		cellFlashingFeature: { flashing?: boolean | FlashingConfig }
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
	interface Table_FeatureMap<TFeatures extends TableFeatures, TData extends RowData> {
		cellFlashingFeature: {
			/**
			 * Flash the rendered cells `params` addresses, whatever the `flashing` option says.
			 * Cells that are not rendered ignore the call, and so does a cell rendered after it.
			 */
			flashCells: (params?: FlashCellsParams) => void
			/** Internal. The last `flashCells` request, read by the React layer's cells. */
			_flashRequests: FlashRequestSource
		}
	}
}

/**
 * Highlights cells whose value changes, and cells the application names — see `flashing` on the
 * table and the column config.
 *
 * A flash is an **event, not table state**: it lives in no slice, reaches no `onStateChange` and no
 * persist utility, and wakes no selector over the table store. What this feature owns is one
 * private atom holding the last `flashCells` request and the method that writes it. Which cells
 * flash, and the phases they flash through, belong to each rendered cell; the automatic flash on a
 * value change never touches the atom at all.
 *
 * The atom holds the *last* request rather than a stream of them, so a cell mounted after a call
 * would read it at once — the React layer takes the `seq` it mounts with as its baseline for that
 * reason.
 */
export const cellFlashingFeature: TableFeature = {
	initTableInstanceData: (table) => {
		// Made through the vanilla binding, as `createDraftAtoms` makes its atoms: a thin wrapper over
		// `@tanstack/store`'s `createAtom`, reached through `table-core` rather than a dependency.
		const requests = storeReactivityBindings().createWritableAtom<FlashRequest | null>(null)
		let seq = 0
		assignTableInstanceData('cellFlashingFeature', table as AnyTable, {
			flashCells: (params = {}) => {
				seq += 1
				requests.set({ ...params, seq })
			},
			_flashRequests: requests,
		})
	},
}
