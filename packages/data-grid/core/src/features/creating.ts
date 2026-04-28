import type { RowData, TableFeature, TableState } from '@tanstack/table-core'

export type CreatingState = {
	isCreating: boolean
	creatingValues: Record<string, unknown>
}

export type CreatingConfig<TData> = {
	/** How the create form is presented. Default: 'row'. */
	mode?: 'row' | 'modal' | 'pin-row'
	/** Called on save. Return false (or Promise<false>) to keep the form open. */
	onSave: (values: Partial<TData>) => boolean | Promise<boolean>
}

declare module '@tanstack/table-core' {
	type TableState = {
		creating: CreatingState
	}

	type TableOptionsResolved<TData extends RowData> = {
		creating?: CreatingConfig<TData>
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type Table<TData extends RowData> = {
		startCreating: () => void
		cancelCreating: () => void
		commitCreating: () => Promise<void>
		setCreatingValue: (key: string, value: unknown) => void
		getCreatingState: () => CreatingState
	}
}

export const CreatingFeature: TableFeature = {
	getInitialState: (state) =>
		({
			...state,
			creating: {
				isCreating: false,
				creatingValues: {},
			} satisfies CreatingState,
		}) as Partial<TableState>,

	createTable: (table) => {
		table.startCreating = () => {
			table.setState((prev) => ({
				...prev,
				creating: { isCreating: true, creatingValues: {} },
			}))
		}

		table.cancelCreating = () => {
			table.setState((prev) => ({
				...prev,
				creating: { isCreating: false, creatingValues: {} },
			}))
		}

		table.commitCreating = async () => {
			const config = table.options.creating
			if (!config) return
			const { creatingValues } = table.getCreatingState()
			const result = await config.onSave(creatingValues as Partial<(typeof table)['options']['data'][number]>)
			if (result) {
				table.cancelCreating()
			}
		}

		table.setCreatingValue = (key, value) => {
			table.setState((prev) => ({
				...prev,
				creating: {
					...prev.creating,
					creatingValues: { ...prev.creating.creatingValues, [key]: value },
				},
			}))
		}

		// creating state is always initialised by getInitialState
		table.getCreatingState = () => table.getState().creating
	},
}
