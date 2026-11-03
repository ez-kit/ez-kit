import { defaultMessages } from './defaults'

import type { GridMessages } from './types'

/**
 * The English dictionary, under the name it shares with the other shipped ones — the same object as
 * {@link defaultMessages}. Each language subpath exports its dictionary as `messages`.
 */
export const messages: GridMessages = defaultMessages
