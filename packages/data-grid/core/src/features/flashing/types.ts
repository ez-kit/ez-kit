import type { FeatureToggle } from '../../utils/feature-flag'

/**
 * How long a flashed cell stays highlighted, at the grid or on one column.
 *
 * A flash has two phases: the highlight holds for `flashDuration`, then fades out over
 * `fadeDuration`. Both are milliseconds.
 */
export type FlashingDurations = {
	/** How long the highlight holds before it starts to fade, in ms. Default: 500. */
	flashDuration?: number
	/** How long the highlight takes to fade out, in ms. Default: 1000. */
	fadeDuration?: number
}

/** The table-level `flashing` object: durations, and the switch every feature option carries. */
export type FlashingConfig = FeatureToggle & FlashingDurations

/**
 * Whether two values of a column are the same value, for flashing.
 *
 * Return `true` for "unchanged". Needed for a column whose value is a fresh object or array on
 * every update — a polled `tags: string[]` — which would otherwise flash on every tick.
 */
export type FlashingEquals = (previous: unknown, next: unknown) => boolean

/** A column's `flashing` object: the grid's durations, overridable, and how to compare values. */
export type ColumnFlashingConfig = FlashingDurations & {
	/**
	 * Whether two values of this column are equal. Default: `Object.is`, except that two `Date`s
	 * are equal when their times are.
	 */
	equals?: FlashingEquals
}

/** Resolved `column.flashing` — present only when the column flashes on its own changes. */
export type ColumnFlashingMeta = {
	flashDuration: number
	fadeDuration: number
	equals?: FlashingEquals
}

/** The durations a flash runs with when neither the grid nor the column names one. */
export const DEFAULT_FLASH_DURATIONS = {
	flashDuration: 500,
	fadeDuration: 1000,
} as const satisfies Required<FlashingDurations>
