import { shallowEqual } from '../controlled'

/**
 * Whether a write left the tracked slice unchanged, so that recording it would only add a step
 * `undo` cannot visibly take back. Shallow on purpose: an immutable manager keeps an untouched field
 * at the same reference, so one level of `Object.is` is exactly "did this field change". Only a
 * binding that was given `partialize` asks — without one the slice is the whole state, and a write
 * that repeats the current values has always recorded.
 */
export function isSameSlice(prev: unknown, next: unknown): boolean {
	return shallowEqual(prev, next)
}
