import { DEFAULT_FLASH_DURATIONS, flashRequestsOf, resolveFlashing } from '@ez-kit/data-grid-core'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { GridFeatures } from '../types'
import type {
	ColumnFlashingMeta,
	FlashingConfig,
	FlashingEquals,
	FlashRequest,
	FlashRequestSource,
} from '@ez-kit/data-grid-core'
import type { Cell } from '@tanstack/table-core'
import type { CSSProperties } from 'react'

/** The two phases a flash runs through; a cell outside a flash carries neither. */
type FlashPhase = 'flash' | 'fade'

type FlashDurations = Pick<ColumnFlashingMeta, 'flashDuration' | 'fadeDuration'>

/** What a body cell spreads onto its `Td` while it flashes. Empty outside a flash. */
export type CellFlash = {
	attrs: { 'data-flash'?: FlashPhase }
	/** `--dg-flash-fade-duration`, which the kit's fade transition reads. */
	vars: CSSProperties | undefined
}

const NO_FLASH: CellFlash = { attrs: {}, vars: undefined }

/**
 * Stands in for the request atom when `cellFlashingFeature` is not registered, so the effect below
 * has one code path. It never changes, so its listener never runs.
 */
const NO_REQUESTS: FlashRequestSource = {
	get: () => null,
	subscribe: () => ({ unsubscribe: () => undefined }),
}

/** `Object.is`, except that two `Date`s with the same time are the same value. */
function sameValue(previous: unknown, next: unknown, equals: FlashingEquals | undefined): boolean {
	if (equals !== undefined) return equals(previous, next)
	if (previous instanceof Date && next instanceof Date) return previous.getTime() === next.getTime()
	return Object.is(previous, next)
}

function addresses(request: FlashRequest, rowId: string, columnId: string): boolean {
	return (
		(request.rowIds === undefined || request.rowIds.includes(rowId)) &&
		(request.columnIds === undefined || request.columnIds.includes(columnId))
	)
}

/**
 * The flash of one body data cell: the automatic one on a value change, and the one
 * `table.flashCells` asks for.
 *
 * The phase is this cell's own state — a flash never touches the table store. The automatic flash
 * compares in an effect, after commit, so StrictMode's double render and an abandoned concurrent
 * render cannot read as a change; the price is one extra render of a cell whose value changed.
 * The last value is recorded on every commit, including while the editor is open, so an update
 * that lands under an editor the user then cancels shows without a flash.
 *
 * A manual request reaches the cell through a subscription to the table's request atom, set up
 * in an effect: the listener checks the address and sets state only in the cells the request
 * names. The atom holds the last request, but its subscription reports changes only, so a cell
 * mounted after a call never sees it.
 *
 * @param isEditorOpen Whether the cell shows its editor. An open editor does not flash; the value
 * is still recorded meanwhile. A group row's placeholder never flashes either — it has no value.
 */
export function useCellFlash<TRow extends object>(
	table: { readonly options: object },
	cell: Cell<GridFeatures, TRow>,
	isEditorOpen: boolean,
): CellFlash {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime-optional feature slice; see the FEATURE GUARDS note in types.ts
	const isActive = !isEditorOpen && !(cell.getIsPlaceholder?.() ?? false)
	const rowId = cell.row.id
	const columnId = cell.column.id
	const columnFlashing = cell.column.columnDef.meta?.flashing
	const requests = flashRequestsOf(table) ?? NO_REQUESTS

	const [flash, setFlash] = useState<{ phase: FlashPhase; fadeDuration: number } | null>(null)
	const timers = useRef<ReturnType<typeof setTimeout>[]>([])

	const trigger = useCallback((durations: FlashDurations) => {
		for (const timer of timers.current) clearTimeout(timer)
		setFlash({ phase: 'flash', fadeDuration: durations.fadeDuration })
		timers.current = [
			setTimeout(() => {
				setFlash({ phase: 'fade', fadeDuration: durations.fadeDuration })
			}, durations.flashDuration),
			setTimeout(() => {
				setFlash(null)
			}, durations.flashDuration + durations.fadeDuration),
		]
	}, [])

	useEffect(
		() => () => {
			for (const timer of timers.current) clearTimeout(timer)
		},
		[],
	)

	// ── automatic: a value change ───────────────────────────────────────────
	const value = cell.getValue<unknown>()
	const lastValue = useRef<{ value: unknown } | null>(null)
	useEffect(() => {
		const last = lastValue.current
		lastValue.current = { value }
		if (last === null || columnFlashing === undefined || !isActive) return
		if (!sameValue(last.value, value, columnFlashing.equals)) trigger(columnFlashing)
	}, [value, columnFlashing, isActive, trigger])

	// ── manual: a `flashCells` request ──────────────────────────────────────
	// The atom's `subscribe` reports changes only, never the value it holds when called, so a cell
	// mounted after a request does not replay it. The address is checked in the callback, so only
	// the cells a request names set state — and only they re-render.
	useEffect(() => {
		if (!isActive) return undefined
		const subscription = requests.subscribe((request) => {
			if (request === null || !addresses(request, rowId, columnId)) return
			const tableFlashing = (table.options as { flashing?: boolean | FlashingConfig }).flashing
			const base = columnFlashing ?? resolveFlashing(true, tableFlashing) ?? DEFAULT_FLASH_DURATIONS
			trigger({
				flashDuration: request.flashDuration ?? base.flashDuration,
				fadeDuration: request.fadeDuration ?? base.fadeDuration,
			})
		})
		return () => {
			subscription.unsubscribe()
		}
	}, [requests, rowId, columnId, isActive, table, columnFlashing, trigger])

	if (flash === null || !isActive) return NO_FLASH
	return {
		attrs: { 'data-flash': flash.phase },
		vars: { ['--dg-flash-fade-duration' as string]: `${String(flash.fadeDuration)}ms` },
	}
}
