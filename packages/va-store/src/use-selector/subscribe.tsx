import { type ReactElement } from 'react'
import { useSnapshot, type Snapshot } from 'valtio'

import { useSelector, type UseSelectorOptions } from './index'

export type SnapshotSubscribeProps<TState extends object> = {
	selector?: never
	isEqual?: never
	/** Receives the auto-tracked snapshot and the raw proxy for writes. */
	children: (snap: Snapshot<TState>, store: TState) => ReactElement
}

export type SelectedSubscribeProps<TState extends object, TSelected> = UseSelectorOptions<TSelected> & {
	selector: (snap: Snapshot<TState>) => TSelected
	/** Receives the selection and the raw proxy for writes. */
	children: (selected: TSelected, store: TState) => ReactElement
}

export type SubscribeComponent<TState extends object> = {
	(props: SnapshotSubscribeProps<TState>): ReactElement
	<TSelected>(props: SelectedSubscribeProps<TState, TSelected>): ReactElement
}

export type SubscribeProps<TState extends object, TSelected = Snapshot<TState>> =
	SnapshotSubscribeProps<TState> | SelectedSubscribeProps<TState, TSelected>

function SnapshotSubscribe<TState extends object>({
	store,
	children,
}: SnapshotSubscribeProps<TState> & { store: TState }): ReactElement {
	return children(useSnapshot(store), store)
}

function SelectedSubscribe<TState extends object, TSelected>({
	store,
	selector,
	children,
	...options
}: SelectedSubscribeProps<TState, TSelected> & { store: TState }): ReactElement {
	return children(useSelector(store, selector, options), store)
}

/** Separate components keep hooks unconditional when a caller switches subscription mode. */
export function ProxySubscribe<TState extends object, TSelected>(
	props: SubscribeProps<TState, TSelected> & { store: TState },
): ReactElement {
	if (props.selector) return <SelectedSubscribe {...props} />
	return <SnapshotSubscribe {...props} />
}
