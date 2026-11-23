import { createContextStore, pipe } from '@ez-kit/va-store'
import { withPersist } from '@ez-kit/va-store/persist'
import { proxy } from 'valtio'

export const panel = createContextStore(
	() =>
		pipe(
			proxy({ width: 320 }),
			withPersist({
				restore: { timeoutMs: 1500 },
				fields: (field) => [field((state) => state.width, {})],
			}),
		),
	{ name: 'guide-panel' },
)
