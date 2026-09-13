import { BetweenInputType } from '@ez-kit/data-grid-core'

import type { BetweenInputProps } from '../types'
import type { BetweenValue, DateRangePreset } from '@ez-kit/data-grid-core'

/**
 * Which shape the between-filter renders. Derived from `variant` + `type` in one place so
 * every UI kit branches identically — the dispatch order is part of the behaviour, not styling.
 */
export const BetweenBranch = {
	/** A two-handle range slider. Number columns that declared a bounded domain. */
	Slider: 'slider',
	/** One trigger opening a range calendar. Every date column. */
	DateRange: 'date-range',
	/** Two number fields. */
	NumberInputs: 'number-inputs',
} as const

export type BetweenBranch = (typeof BetweenBranch)[keyof typeof BetweenBranch]

/** Empty string, not `undefined` — a controlled `<input type='number'>` needs a defined value. */
const EMPTY_INPUT = ''

export type BetweenPresetsController = {
	items: DateRangePreset[]
	onSelect: (preset: DateRangePreset) => void
	/**
	 * Id of the preset whose range the filter currently holds, or `null` when the range was
	 * typed by hand, is half-set, or matches none. Kits name the trigger after it and tick the
	 * matching entry — computed here so the two kits cannot disagree on what "active" means.
	 */
	activeId: string | null
}

export type BetweenSliderController = {
	min: number
	max: number
	/** `[from, to]`, each falling back to the corresponding bound while unset. */
	values: [number, number]
	/** Accepts whatever the kit's slider emits; ignores anything that is not a numeric pair. */
	onChange: (next: unknown) => void
}

export type BetweenNumberController = {
	min?: number | undefined
	max?: number | undefined
	from: number | typeof EMPTY_INPUT
	to: number | typeof EMPTY_INPUT
	/** Takes `event.target.valueAsNumber` — `NaN` (empty field) clears that end. */
	onFromChange: (raw: number) => void
	onToChange: (raw: number) => void
}

export type BetweenController = {
	branch: BetweenBranch
	/** `null` when the column configures no presets — the kit then renders no preset menu. */
	presets: BetweenPresetsController | null
	slider: BetweenSliderController
	numbers: BetweenNumberController
}

/**
 * A date column has exactly one control, so the only real decision is whether a number column's
 * range is bounded enough to be a slider. `slider` without both bounds is the author's mistake —
 * `mapColumns` warns about it — and two fields are the honest fallback, where this used to invent
 * a `0..100` domain.
 */
function resolveBranch(
	type: BetweenInputProps['type'],
	slider: boolean | undefined,
	min: number | undefined,
	max: number | undefined,
): BetweenBranch {
	if (type === BetweenInputType.Date) return BetweenBranch.DateRange
	if (slider === true && min !== undefined && max !== undefined) return BetweenBranch.Slider
	return BetweenBranch.NumberInputs
}

function toNumberInputValue(value: unknown): number | typeof EMPTY_INPUT {
	return typeof value === 'number' && !Number.isNaN(value) ? value : EMPTY_INPUT
}

/**
 * Which preset the current range came from, by value rather than by memory of the last click:
 * a range the user then edited by hand stops being "Last 7 days", and one restored from a deep
 * link is recognised without any click having happened in this session.
 */
function findActivePreset(items: DateRangePreset[], value: BetweenValue): string | null {
	if (value.from === undefined || value.to === undefined) return null
	return (
		items.find((preset) => {
			const range = preset.getRange()
			return range.from === value.from && range.to === value.to
		})?.id ?? null
	)
}

function readNumericPair(next: unknown): [number, number] | null {
	if (!Array.isArray(next)) return null
	const [from, to] = next as unknown[]
	if (typeof from !== 'number' || typeof to !== 'number') return null
	return [from, to]
}

/**
 * Everything a `BetweenInput` needs that is not a visual choice: which branch to render,
 * the slider's resolved bounds, `NaN`-safe number handlers, and the preset gate.
 *
 * Lives here rather than in each kit because these are the parts that silently drifted when
 * they were copied — the shadcn flavour had lost `min`/`max` on its number inputs entirely.
 *
 * The date-range branch deliberately gets no controller: the kits model dates differently
 * (`Date` + date-fns vs `CalendarDate` + `@internationalized/date`), so there is nothing
 * kit-agnostic to share there.
 */
export function useBetweenValue({
	value,
	onChange,
	type,
	slider,
	min,
	max,
	presets,
	onPresetSelect,
}: BetweenInputProps): BetweenController {
	// `resolveBranch` only returns `Slider` when both bounds are defined, so these fallbacks are
	// unreachable on that branch. They exist so the controller can state `min` / `max` as `number`
	// for the kits, which read them off every branch.
	const sliderMin = min ?? 0
	const sliderMax = max ?? 0

	const setEnd = (end: keyof BetweenValue, next: unknown): void => {
		onChange({ ...value, [end]: next })
	}

	return {
		branch: resolveBranch(type, slider, min, max),
		presets:
			presets && presets.length > 0 && onPresetSelect
				? { items: presets, onSelect: onPresetSelect, activeId: findActivePreset(presets, value) }
				: null,
		slider: {
			min: sliderMin,
			max: sliderMax,
			values: [
				typeof value.from === 'number' ? value.from : sliderMin,
				typeof value.to === 'number' ? value.to : sliderMax,
			],
			onChange: (next) => {
				const pair = readNumericPair(next)
				if (!pair) return
				onChange({ from: pair[0], to: pair[1] })
			},
		},
		numbers: {
			...(min === undefined ? {} : { min }),
			...(max === undefined ? {} : { max }),
			from: toNumberInputValue(value.from),
			to: toNumberInputValue(value.to),
			onFromChange: (raw) => {
				setEnd('from', Number.isNaN(raw) ? undefined : raw)
			},
			onToChange: (raw) => {
				setEnd('to', Number.isNaN(raw) ? undefined : raw)
			},
		},
	}
}
