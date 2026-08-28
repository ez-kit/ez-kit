import { describe, expect, it } from 'vitest'

import {
	BetweenInputType,
	BetweenInputVariant,
	GridDirection,
	ColumnResizeMode,
	ColumnSortUndefined,
	CommitStatus,
	FilterChipKind,
	FilterChipsPosition,
	FilteringVariant,
	ColumnSortDirection,
	LoadMoreDirection,
	LoadMoreTrigger,
	MultiSortEvent,
	PaginationMode,
	SortDirection,
	SystemColumnType,
	ValidateOn,
} from './index'

import type { UseDataGridConfig } from './index'

type Row = { id: string; name: string }

/**
 * The property this refactor must not break: every closed set is a `const` object **plus** a
 * same-named union of the bare literals, so a consumer keeps writing `mode: 'onEnd'` and never
 * imports anything. A TS `enum` would make each of these a compile error — which is exactly the
 * regression this file exists to catch, since `tsc` checks it during typecheck.
 */
describe('closed sets keep the bare-string form valid for consumers', () => {
	it('accepts bare strings for every consumer-facing option', () => {
		const config: UseDataGridConfig<Row> = {
			data: [],
			columns: [
				{
					accessorKey: 'name',
					sorting: { undefined: 'last' },
					editing: { validateOn: 'blur' },
					cell: { type: 'badge', config: { items: [{ value: 'a', label: 'A', variant: 'destructive' }] } },
				},
			],
			sorting: { multi: { event: 'ctrl' } },
			direction: 'rtl',
			resizing: { mode: 'onEnd' },
			filtering: { variant: 'popover', chips: { position: 'below' } },
			pagination: { mode: 'infinite', trigger: 'manual' },
			expanding: { mode: 'tree' },
			editing: { validateOn: 'change', onSave: () => undefined },
		}

		expect(config.data).toEqual([])
	})

	it('exposes the named members, each equal to its bare literal', () => {
		expect(ColumnResizeMode.OnEnd).toBe('onEnd')
		expect(GridDirection.Ltr).toBe('ltr')
		expect(ColumnSortUndefined.Last).toBe('last')
		expect(CommitStatus.Validating).toBe('validating')
		expect(MultiSortEvent.Ctrl).toBe('ctrl')
		expect(PaginationMode.Infinite).toBe('infinite')
		expect(LoadMoreDirection.Forward).toBe('forward')
		expect(LoadMoreTrigger.Manual).toBe('manual')
		expect(ValidateOn.Blur).toBe('blur')
		expect(SystemColumnType.Actions).toBe('actions')
		expect(SortDirection.Asc).toBe('asc')
		expect(ColumnSortDirection.None).toBe('none')
		expect(FilterChipKind.Global).toBe('global')
		expect(FilteringVariant.Popover).toBe('popover')
		expect(FilterChipsPosition.Below).toBe('below')
		expect(BetweenInputVariant.Slider).toBe('slider')
		expect(BetweenInputType.Date).toBe('date')
	})

	it('accepts the named member wherever the bare string is accepted', () => {
		const config: UseDataGridConfig<Row> = {
			data: [],
			columns: [],
			resizing: { mode: ColumnResizeMode.OnEnd },
			filtering: { variant: FilteringVariant.Popover },
			pagination: { mode: PaginationMode.Infinite, trigger: LoadMoreTrigger.Manual },
		}

		expect(config.columns).toEqual([])
	})
})
