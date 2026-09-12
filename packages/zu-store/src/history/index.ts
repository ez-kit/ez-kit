'use client'

export { useHistory } from './use-history'
export { useTimeline } from './use-timeline'
export type { Timeline } from './use-timeline'
export { withHistory } from './with-history'
export type { HistoryActionTag, HistoryOptions, StoreHistory } from './types'

/** The live stacks inside `StoreHistory` — re-exported so a consumer can annotate them on their own. */
export type { HistorySnapshot } from '@ez-kit/store-core/history'
