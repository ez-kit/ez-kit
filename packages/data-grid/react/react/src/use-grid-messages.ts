'use client'

import { defaultMessages } from '@ez-kit/data-grid-core'
import { useContext } from 'react'

import { TableContext } from './data-grid/table-context'

import type { GridMessages } from '@ez-kit/data-grid-core'

/**
 * Every user-facing string, resolved — the grid's `messages` folded onto the English
 * dictionary. This is what a UI kit reads instead of holding a literal of its own.
 *
 * Unlike {@link useGridOptions}, it does **not** require the grid context: a kit component
 * rendered on its own (a `<EmptyState />` in a story, a block under test) falls back to
 * {@link defaultMessages}. Throwing there would trade a working English default for a crash,
 * which is a worse deal than the literal this replaced.
 *
 * @example
 * const messages = useGridMessages()
 * return <span>{messages.pagination.rowsPerPage}</span>
 */
export function useGridMessages(): GridMessages {
	return useContext(TableContext)?.grid.messages ?? defaultMessages
}
