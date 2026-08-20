import type { BetweenInputProps } from '../types'
import type { BetweenValue, DateRangePreset } from '@ez-kit/data-grid-core'

/**
 * Which shape the between-filter renders. Derived from `variant` + `type` in one place so
 * every UI kit branches identically — the dispatch order is part of the behaviour, not styling.
 */
export enum BetweenBranch {
	Slider = 'slider',
	Calendar = 'calendar',
	DateInputs = 'date-inputs',
	NumberInputs = 'number-inputs',
}

const DEFAULT_SLIDER_MIN = 0
const DEFAULT_SLIDER_MAX = 100

/** Empty string, not `undefined` — a controlled `<input type='number'>` needs a defined value. */
const EMPTY_INPUT = ''

export type BetweenPresetsController = {
	items: DateRangePreset[]
	onSelect: (preset: DateRangePreset) => void
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

export type BetweenDateController = {
	from: unknown
	to: unknown
	onFromChange: (next: unknown) => void
	onToChange: (next: unknown) => void
}

export type BetweenController = {
	branch: BetweenBranch
	/** `null` when the column configures no presets — the kit then renders no preset row. */
	presets: BetweenPresetsController | null
	slider: BetweenSliderController
	numbers: BetweenNumberController
	dates: BetweenDateController
}

function resolveBranch(variant: BetweenInputProps['variant'], type: BetweenInputProps['type']): BetweenBranch {
	if (variant === 'slider') return BetweenBranch.Slider
	if (variant === 'calendar' && type === 'date') return BetweenBranch.Calendar
	if (type === 'date') return BetweenBranch.DateInputs
	return BetweenBranch.NumberInputs
}

function toNumberInputValue(value: unknown): number | typeof EMPTY_INPUT {
	return typeof value === 'number' && !Number.isNaN(value) ? value : EMPTY_INPUT
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
 * The calendar branch deliberately gets no controller: the kits model dates differently
 * (`Date` + date-fns vs `CalendarDate` + `@internationalized/date`), so there is nothing
 * kit-agnostic to share there.
 */
export function useBetweenValue({
	value,
	onChange,
	variant,
	type,
	min,
	max,
	presets,
	onPresetSelect,
}: BetweenInputProps): BetweenController {
	const sliderMin = min ?? DEFAULT_SLIDER_MIN
	const sliderMax = max ?? DEFAULT_SLIDER_MAX

	const setEnd = (end: keyof BetweenValue, next: unknown): void => {
		onChange({ ...value, [end]: next })
	}

	return {
		branch: resolveBranch(variant, type),
		presets: presets && presets.length > 0 && onPresetSelect ? { items: presets, onSelect: onPresetSelect } : null,
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
		dates: {
			from: value.from,
			to: value.to,
			onFromChange: (next) => {
				setEnd('from', next)
			},
			onToChange: (next) => {
				setEnd('to', next)
			},
		},
	}
}
