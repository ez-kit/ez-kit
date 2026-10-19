import { Component, memo, Suspense, useEffect, useSyncExternalStore } from 'react'

import { useItemsSourceStore } from './context'

import type { ItemsSourceStore } from './store'
import type { ListSource } from './types'
import type { ItemsSourceParams } from '@ez-kit/data-grid-core'
import type { ReactNode } from 'react'

/** The params every hook is called with today. Frozen and shared, so a hook may memoize on it. */
const PARAMS: ItemsSourceParams = Object.freeze({})

type RunnerProps = {
	sourceKey: string
	version: number
	hook: ListSource
	store: ItemsSourceStore
}

/**
 * Calls exactly one source's hook and publishes what it returns.
 *
 * One component per hook is what keeps the rules of hooks: each hook is called unconditionally at
 * the top of its own component, and which hooks run is decided by which runners are mounted, not
 * by a condition. The result goes to the store in an effect — writing an external store during
 * render is not allowed — and the store drops a result that changed nothing.
 *
 * Memoized on primitive props, so a re-render of the grid around it does not call the hook again:
 * the hook re-runs when its own state changes, which is when its answer can have.
 */
const SourceRunner = memo(function SourceRunner({ sourceKey, version, hook, store }: RunnerProps) {
	const useSource = hook
	const { items, isLoading, error } = useSource(PARAMS)

	useEffect(() => {
		store.publish(sourceKey, version, { items, isLoading: isLoading === true, error })
	}, [store, sourceKey, version, items, isLoading, error])

	return null
})

/**
 * What a suspended runner renders: nothing, after telling its readers the list is loading — a hook
 * that suspends (`useSuspenseQuery`, `use(promise)`) is waited for here, inside its own source,
 * rather than at the consumer's nearest boundary with the whole grid behind it.
 */
function SuspendedRunner({ sourceKey, version, store }: Omit<RunnerProps, 'hook'>) {
	useEffect(() => {
		store.publish(sourceKey, version, { items: [], isLoading: true })
	}, [store, sourceKey, version])
	return null
}

type RunnerBoundaryProps = Omit<RunnerProps, 'hook'> & { children: ReactNode }

/**
 * Keeps a hook that throws — a query with `throwOnError`, a parse error — inside its own source:
 * the failure becomes that list's `error`, the way a returned one would, instead of unmounting the
 * whole grid at the consumer's nearest boundary.
 *
 * It never resets itself: the store schedules the retry, by changing the runner's key, which
 * mounts a fresh boundary — see `ItemsSourceStore.fail`.
 */
class RunnerBoundary extends Component<RunnerBoundaryProps, { failed: boolean }> {
	override state = { failed: false }

	static getDerivedStateFromError(): { failed: boolean } {
		return { failed: true }
	}

	override componentDidCatch(error: unknown): void {
		const { sourceKey, version, store } = this.props
		store.fail(sourceKey, version, error)
	}

	override render(): ReactNode {
		return this.state.failed ? null : this.props.children
	}
}

/**
 * Runs the hook of every value list something on screen reads, and nothing else.
 *
 * Rendered inside the grid's providers, so a hook may read the grid — `useDataGridState` for the
 * current filters is how server-side counts follow them. A runner is keyed by its hook's identity
 * version and by its retry attempt: a new function is a new hook, and a hook that threw is run
 * again, and both can only happen by remounting.
 */
export const ItemsSourceHost = memo(function ItemsSourceHost() {
	const store = useItemsSourceStore()
	if (store === null) return null
	return <ActiveRunners store={store} />
})

function ActiveRunners({ store }: { store: ItemsSourceStore }) {
	const active = useSyncExternalStore(store.subscribeActive, store.getActive, store.getActive)
	return active.map((source) => {
		const props = { sourceKey: source.key, version: source.version, store }
		return (
			<RunnerBoundary
				key={`${source.key}#v${String(source.version)}.${String(source.attempt)}`}
				{...props}
			>
				<Suspense fallback={<SuspendedRunner {...props} />}>
					<SourceRunner
						{...props}
						hook={source.hook}
					/>
				</Suspense>
			</RunnerBoundary>
		)
	})
}
