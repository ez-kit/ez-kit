'use client'

export { useHistory } from './use-history'
export { useTimeline } from './use-timeline'
export type { Timeline } from './use-timeline'
export { withHistory } from './with-history'
export type { HistoryActionTag, HistoryOptions, HistoryState } from './types'

/** The live stacks inside `HistoryState` — re-exported so a consumer can annotate them on their own. */
export type { HistorySnapshot } from '@ez-kit/store-core/history'
