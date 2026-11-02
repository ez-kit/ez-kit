import { defaultMessages } from './defaults'

import type { GridMessages } from './types'

/**
 * The English dictionary, under the name it shares with the other shipped ones — the same object as
 * {@link defaultMessages}, so a grid that switches language reads `lang === 'ru' ? ruMessages :
 * enMessages` rather than reaching for the default by another name.
 */
export const enMessages: GridMessages = defaultMessages
