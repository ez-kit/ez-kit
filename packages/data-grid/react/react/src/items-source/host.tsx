import { Component, Suspense, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

import { useItemsSourceStore } from './context'

import type { ActiveSource, ItemsSourceStore } from './store'
import type { ListSource } from './types'
import type { ItemsSourceParams } from '@ez-kit/data-grid-core'
import type { ReactElement, ReactNode } from 'react'

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
 * Not re-rendered by the grid around it, so the hook is not called again: the elements that
 * mount it are built once per active set (see {@link ActiveRunners}), and React bails out of an
 * element it has already rendered. The hook re-runs when its own state changes, which is when its
 * answer can have.
 */
function SourceRunner({ sourceKey, version, hook, store }: RunnerProps) {
	const useSource = hook
	const { items, isLoading, error } = useSource(PARAMS)

	useEffect(() => {
		store.publish(sourceKey, version, { items, isLoading: isLoading === true, error })
	}, [store, sourceKey, version, items, isLoading, error])

	return null
}

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
 *
 * Takes no props and is mounted as an element the grid builds **once** (`DataGridControlled`
 * memoises it), so a re-render of the grid's host stops here, the way it stops at `children`.
 */
export function ItemsSourceHost() {
	const store = useItemsSourceStore()
	if (store === null) return null
	return <ActiveRunners store={store} />
}

/**
 * One runner element per active source, each built **once** and reused for as long as its source
 * stays active under the same key. React bails out of an element it is handed again, so neither a
 * re-render of the grid nor a change to the active set — another list starting or stopping being
 * read — calls a runner's hook again. A new hook (`version`) or a retry (`attempt`) is a new key,
 * which builds a new element and remounts the runner, as it must.
 *
 * The cache is keyed by the same string as the element's React key, and rebuilt from the active set
 * each time that set changes, so an element for a source that left is dropped with it.
 */
function ActiveRunners({ store }: { store: ItemsSourceStore }) {
	const active = useSyncExternalStore(store.subscribeActive, store.getActive, store.getActive)
	const elementsRef = useRef<ReadonlyMap<string, ReactElement>>(new Map())
	return useMemo(() => {
		const next = new Map<string, ReactElement>()
		for (const source of active) {
			const key = `${source.key}#v${String(source.version)}.${String(source.attempt)}`
			next.set(key, elementsRef.current.get(key) ?? buildRunner(store, source, key))
		}
		elementsRef.current = next
		return [...next.values()]
	}, [active, store])
}

function buildRunner(store: ItemsSourceStore, source: ActiveSource, key: string): ReactElement {
	const props = { sourceKey: source.key, version: source.version, store }
	return (
		<RunnerBoundary
			key={key}
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
}
