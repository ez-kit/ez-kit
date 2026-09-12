'use client'

export { useHistory } from './use-history'
export { useTimeline } from './use-timeline'
export type { Timeline } from './use-timeline'
export { withHistory } from './with-history'
export type { HistoryOp, HistoryOptions, StoreHistory } from './with-history'

/** The live stacks behind `store.history.state` — re-exported so a consumer can annotate them. */
export type { HistorySnapshot } from '@ez-kit/store-core/history'
