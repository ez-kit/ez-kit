import { formatFieldErrors } from '@ez-kit/form-core'
import { createContext, useCallback, useContext, useRef } from 'react'

import { fieldValidators } from '../field-validate'

import type { BindableForm, BoundFieldApi } from '../bindable-form'
import type { ArrayFieldRenderProps, FormComponents } from '../contract'
import type { ArrayFieldProps, ArrayItemProps, ArrayProps, ArrayScope, FormFieldComponents } from '../field-props'
import type { FieldValidateProps } from '../field-validate'
import type { ReactNode } from 'react'

const ARRAY_FIELD_TYPE = 'array'

/**
 * Changes whenever the entries' key order changes — the exact string is arbitrary, only its
 * identity as a *value* matters. `Scoped` reads this through `useContext` purely to subscribe:
 * React re-runs a context consumer even behind a `React.memo` bail-out, which a plain closure
 * read during render does not get. Without this, a memoized row wrapped around a scoped field
 * keeps stale props across a reorder and silently writes into the wrong entry — the field itself
 * still resolves its *current* path correctly (that part comes from `getPath`, read fresh every
 * call), but nothing forces the memoized parent to call it again.
 *
 * Each `ArrayBody` provides its own value, which **shadows** the outer one for everything nested
 * below it — so a nested array's provider only changes when *its own* key order changes, never
 * when an ancestor array's does. That is why the value is prefixed with the array's own
 * `fieldName`: a nested array's `fieldName` is itself the path the outer array resolved for that
 * entry (e.g. `teams[0].members`), so it changes whenever an ancestor reorders even though the
 * nested array's own `keys.keys` does not — which is exactly the case a memoized row one level
 * down needs to be forced to re-render for.
 */
const ArrayKeyOrderContext = createContext<string>('')

/**
 * Wraps one field component so its `name` prop is read as **item-relative** and handed on
 * resolved.
 *
 * `getPath` is read during render rather than closed over as a plain string, so a single
 * `Scoped` instance stays valid across a reorder that renumbers its entry — the entry's own
 * key never changes, only the path the key currently resolves to. Subscribing to
 * `ArrayKeyOrderContext` is what makes that value actually get re-read when it changes; see the
 * context's own doc comment.
 *
 * Resolving here rather than inside `form.AppField` is what keeps the rest of the package
 * untouched: the wrapped component receives a fully absolute name, so its `AppField`, its
 * `fieldValidators` and the option-source plumbing's `setFieldValue` all address the right path
 * without knowing arrays exist.
 */
function scopeComponent<TProps extends { name: string }>(
	Inner: (props: TProps) => ReactNode,
	getPath: () => string | undefined,
): (props: TProps) => ReactNode {
	return function Scoped(props: TProps): ReactNode {
		useContext(ArrayKeyOrderContext)
		const prefix = getPath()
		const name = prefix === undefined ? props.name : `${prefix}.${props.name}`
		return (
			<Inner
				{...props}
				name={name}
			/>
		)
	}
}

/** Stable ids for the entries, maintained across add / remove / move. */
function useItemKeys(length: number): {
	keys: readonly string[]
	onAdd: () => void
	onInsert: (index: number) => void
	onRemove: (index: number) => void
	onMove: (from: number, to: number) => void
} {
	const nextId = useRef(0)
	const keysRef = useRef<string[]>([])
	const create = useCallback((): string => {
		const id = `item-${String(nextId.current)}`
		nextId.current += 1
		return id
	}, [])

	// The list can also change from outside — a reset, a server payload — and there is no event
	// for that, so the length is reconciled on render. Growth appends fresh ids; a shrink that
	// did not come through `onRemove` can only be truncated, since nothing says which went.
	while (keysRef.current.length < length) keysRef.current.push(create())
	if (keysRef.current.length > length) keysRef.current.length = length

	const onAdd = useCallback(() => {
		keysRef.current.push(create())
	}, [create])

	const onInsert = useCallback(
		(index: number) => {
			keysRef.current.splice(index, 0, create())
		},
		[create],
	)

	const onRemove = useCallback((index: number) => {
		keysRef.current.splice(index, 1)
	}, [])

	const onMove = useCallback((from: number, to: number) => {
		const [moved] = keysRef.current.splice(from, 1)
		if (moved !== undefined) keysRef.current.splice(to, 0, moved)
	}, [])

	return { keys: keysRef.current, onAdd, onInsert, onRemove, onMove }
}

/** Build the `ArrayField` component bound to one form instance. */
export function createArrayField<TFormData>(
	form: BindableForm,
	components: FormComponents,
	fieldComponents: FormFieldComponents<TFormData>,
): FormFieldComponents<TFormData>['ArrayField'] {
	const { ArrayField: KitArrayField } = components

	// The record is the same object the form already exposes; only its *type* is reinterpreted
	// per entry, because inside an entry the same components address the item's paths rather
	// than the form's. The runtime scoping happens per key inside `ArrayBody`.
	const unscoped = fieldComponents as unknown as FormFieldComponents<unknown>

	return function ArrayField<TItem>({
		name,
		label,
		description,
		disabled,
		required,
		validate,
		reorderable,
		newItem,
		addLabel,
		removeLabel,
		itemLabel,
		children,
	}: ArrayFieldProps<TFormData, TItem>): ReactNode {
		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<ArrayBody
						field={field}
						fieldName={name}
						components={components}
						fieldComponents={unscoped}
						label={label}
						description={description}
						disabled={disabled}
						required={required}
						reorderable={reorderable}
						newItem={newItem}
						addLabel={addLabel}
						removeLabel={removeLabel}
						itemLabel={itemLabel}
						validate={validate}
						render={(scope, frame) => (
							<KitArrayField {...frame}>
								{/* The body works on the erased item type; only the consumer-facing props keep it. */}
								{(children as unknown as (s: typeof scope) => ReactNode)(scope)}
							</KitArrayField>
						)}
					/>
				)}
			</form.AppField>
		)
	} as FormFieldComponents<TFormData>['ArrayField']
}

/**
 * Build the `Array` component bound to one form instance — the headless counterpart of
 * `ArrayField`.
 *
 * It shares `ArrayBody` with `ArrayField` but supplies no presentational props (`label`,
 * `addLabel`, …) and renders no kit chrome around the entries: `render` hands the scope
 * straight to the author's `children`, so the only DOM `form.Array` produces is whatever the
 * children themselves render. Scoping the entries' fields is `ArrayBody`'s job, not this one's —
 * see the module doc comment on `scopeComponent`.
 */
export function createArray<TFormData>(
	form: BindableForm,
	components: FormComponents,
	fieldComponents: FormFieldComponents<TFormData>,
): FormFieldComponents<TFormData>['Array'] {
	const unscoped = fieldComponents as unknown as FormFieldComponents<unknown>

	return function ArrayPrimitive<TItem>({
		name,
		disabled,
		required,
		validate,
		newItem,
		children,
	}: ArrayProps<TFormData, TItem>): ReactNode {
		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<ArrayBody
						field={field}
						fieldName={name}
						components={components}
						fieldComponents={unscoped}
						label={null}
						description={null}
						disabled={disabled}
						required={required}
						reorderable={undefined}
						newItem={newItem}
						addLabel={undefined}
						removeLabel={undefined}
						itemLabel={undefined}
						validate={validate}
						render={(scope) => (children as unknown as (s: typeof scope) => ReactNode)(scope)}
					/>
				)}
			</form.AppField>
		)
	} as FormFieldComponents<TFormData>['Array']
}

const DEFAULT_ADD_LABEL = 'Add'
const DEFAULT_REMOVE_LABEL = 'Remove'
const DEFAULT_MOVE_UP_LABEL = 'Move up'
const DEFAULT_MOVE_DOWN_LABEL = 'Move down'

/** Everything one entry's chrome needs, refreshed on every render and read through a ref. */
type ItemData = {
	index: number
	path: string
	label: ReactNode
	removeLabel: ReactNode
	moveUpLabel: ReactNode
	moveDownLabel: ReactNode
	disabled: boolean | undefined
	/** The array-level `reorderable` setting — `Item`'s own fallback when no prop overrides it. */
	reorderable: ArrayFieldProps<unknown, unknown>['reorderable']
	onRemove: () => void
	/**
	 * Stored unconditionally — `undefined` only where the move is actually impossible (the
	 * entry's own end), never because the array itself declined `reorderable`. That is what lets
	 * a single row opt in via `<item.Item reorderable>` without the array having asked for it.
	 */
	onMoveUp: (() => void) | undefined
	onMoveDown: (() => void) | undefined
}

/** The frame `ArrayField` renders around the entries — everything but the entries themselves. */
type ArrayFrameProps = Omit<ArrayFieldRenderProps, 'children'>

type ArrayBodyProps = {
	field: BoundFieldApi
	fieldName: string
	components: FormComponents
	fieldComponents: FormFieldComponents<unknown>
	label: ReactNode
	description: ReactNode
	disabled: boolean | undefined
	required: boolean | undefined
	reorderable: ArrayFieldProps<unknown, unknown>['reorderable']
	newItem: unknown
	addLabel: ReactNode
	removeLabel: ReactNode
	itemLabel: ((index: number) => ReactNode) | undefined
	/**
	 * The list's own constraints. `maxLength` is read here as well as by the validator: once the
	 * bound is reached there is nothing to add, so the control goes disabled rather than letting
	 * the user produce a state whose only feedback is an error message.
	 */
	validate: FieldValidateProps | undefined
	render: (scope: ArrayScope<unknown>, frame: ArrayFrameProps) => ReactNode
}

function ArrayBody({
	field,
	fieldName,
	components,
	fieldComponents,
	label,
	description,
	disabled,
	required,
	reorderable,
	newItem,
	addLabel,
	removeLabel,
	itemLabel,
	validate,
	render,
}: ArrayBodyProps): ReactNode {
	const { ArrayItem: KitArrayItem } = components
	const list = Array.isArray(field.state.value) ? (field.state.value as readonly unknown[]) : []
	const keys = useItemKeys(list.length)

	// Read during render, never subscribed to: the per-key components below re-render because
	// their parent does and their `children` change, so a ref is enough to hand them fresh data
	// without giving them a new identity.
	const itemDataRef = useRef(new Map<string, ItemData>())
	const itemComponentsRef = useRef(new Map<string, (props: ArrayItemProps) => ReactNode>())
	const scopedFieldsRef = useRef(new Map<string, FormFieldComponents<unknown>>())

	const write = (next: readonly unknown[]): void => {
		field.handleChange(next)
	}

	const add = (): void => {
		keys.onAdd()
		write([...list, newItem])
	}

	const insert = (index: number, value?: unknown): void => {
		keys.onInsert(index)
		const next = [...list]
		next.splice(index, 0, value === undefined ? newItem : value)
		write(next)
	}

	const remove = (index: number): void => {
		keys.onRemove(index)
		write(list.filter((_, position) => position !== index))
	}

	const move = (from: number, to: number): void => {
		keys.onMove(from, to)
		const next = [...list]
		const [moved] = next.splice(from, 1)
		if (moved !== undefined) next.splice(to, 0, moved)
		write(next)
	}

	/**
	 * One component per **key**, not per index.
	 *
	 * React reconciles by `(type, key)`, so an entry whose component identity changes is
	 * unmounted and remounted even when its key is stable. Creating these inside the render loop
	 * would do exactly that on every render; keying the cache by the entry's own id keeps each
	 * one alive for as long as the entry is, including across the renumbering a removal from the
	 * middle causes.
	 */
	const componentFor = (key: string): ((props: ArrayItemProps) => ReactNode) => {
		const existing = itemComponentsRef.current.get(key)
		if (existing !== undefined) return existing

		const Item = ({
			children: itemChildren,
			label,
			removeLabel,
			reorderable: rowReorderable,
		}: ArrayItemProps): ReactNode => {
			const data = itemDataRef.current.get(key)
			if (data === undefined) return null
			// prop → the array's own setting → the kit's default, at every caption — see `ArrayItemProps`.
			const rowReorder = rowReorderable ?? data.reorderable
			const rowLabels = typeof rowReorder === 'object' ? rowReorder : undefined
			const offerMoves = rowReorder !== undefined && rowReorder !== false
			return (
				<KitArrayItem
					data-index={data.index}
					index={data.index}
					label={label ?? data.label}
					removeLabel={removeLabel ?? data.removeLabel}
					moveUpLabel={rowLabels?.up?.label ?? data.moveUpLabel}
					moveDownLabel={rowLabels?.down?.label ?? data.moveDownLabel}
					disabled={data.disabled}
					onRemove={data.onRemove}
					onMoveUp={offerMoves ? data.onMoveUp : undefined}
					onMoveDown={offerMoves ? data.onMoveDown : undefined}
				>
					{itemChildren}
				</KitArrayItem>
			)
		}
		itemComponentsRef.current.set(key, Item)
		return Item
	}

	/**
	 * The item's own field set (`item.TextField`, …), scoped to this entry's path — cached by
	 * **key**, for the same reason `componentFor` is: each field's identity must survive a
	 * reorder. It is read directly off `itemDataRef` rather than through context, so it resolves
	 * correctly whether or not the author wraps the entry's fields in `<item.Item>` — the two are
	 * independent, and the fields do not depend on the entry's chrome to find their own path.
	 */
	const scopedFieldsFor = (key: string): FormFieldComponents<unknown> => {
		const existing = scopedFieldsRef.current.get(key)
		if (existing !== undefined) return existing

		const record = Object.fromEntries(
			Object.entries(fieldComponents).map(([name, Component]) => [
				name,
				scopeComponent(Component as (props: { name: string }) => ReactNode, () => itemDataRef.current.get(key)?.path),
			]),
		) as unknown as FormFieldComponents<unknown>
		scopedFieldsRef.current.set(key, record)
		return record
	}

	// `true` and the object form both mean "offer reordering"; the object only adds captions.
	const reorderLabels = typeof reorderable === 'object' ? reorderable : undefined

	const items = list.map((_, index) => {
		const key = keys.keys[index] ?? String(index)
		itemDataRef.current.set(key, {
			index,
			path: `${fieldName}[${String(index)}]`,
			label: itemLabel?.(index) ?? null,
			removeLabel: removeLabel ?? DEFAULT_REMOVE_LABEL,
			moveUpLabel: reorderLabels?.up?.label ?? DEFAULT_MOVE_UP_LABEL,
			moveDownLabel: reorderLabels?.down?.label ?? DEFAULT_MOVE_DOWN_LABEL,
			disabled,
			reorderable,
			onRemove: () => {
				remove(index)
			},
			// Stored unconditionally — `Item` is the one that decides whether to offer them, so a
			// row can opt in with its own `reorderable` even when the array itself did not.
			onMoveUp:
				index > 0
					? () => {
							move(index, index - 1)
						}
					: undefined,
			onMoveDown:
				index < list.length - 1
					? () => {
							move(index, index + 1)
						}
					: undefined,
		})
		return {
			...scopedFieldsFor(key),
			key,
			index,
			isFirst: index === 0,
			isLast: index === list.length - 1,
			remove: () => {
				remove(index)
			},
			moveUp: () => {
				if (index > 0) move(index, index - 1)
			},
			moveDown: () => {
				if (index < list.length - 1) move(index, index + 1)
			},
			Item: componentFor(key),
		}
	})

	// Entries that are gone take their cached component with them, or the maps would grow for
	// the form's whole life. The live set is `keys.keys`; the iteration is over `itemDataRef`,
	// which is written unconditionally for every rendered key above — before either
	// `scopedFieldsFor` or `componentFor` runs — so its keys are a superset of both other
	// caches' by construction. Iterating `itemComponentsRef` instead would only be correct
	// while `componentFor` is called for every live key, which a future caller that builds
	// `Item` lazily would break, leaving `scopedFieldsRef` growing unbounded.
	const liveKeys = new Set(keys.keys)
	for (const key of itemDataRef.current.keys()) {
		if (liveKeys.has(key)) continue
		itemComponentsRef.current.delete(key)
		itemDataRef.current.delete(key)
		scopedFieldsRef.current.delete(key)
	}

	const errors = field.state.meta.isTouched ? formatFieldErrors(field.state.meta.errors) : []
	const invalid = errors.length > 0
	const { maxLength } = validate ?? {}
	const canAdd = maxLength === undefined || list.length < maxLength

	const frame: ArrayFrameProps = {
		'data-field': field.name,
		'data-field-type': ARRAY_FIELD_TYPE,
		name: field.name,
		label,
		description,
		errors,
		invalid,
		disabled,
		required,
		addLabel: addLabel ?? DEFAULT_ADD_LABEL,
		onAdd: add,
		canAdd,
	}

	return (
		<ArrayKeyOrderContext.Provider value={`${fieldName}:${keys.keys.join(',')}`}>
			{render(
				{
					items,
					add,
					insert,
					remove,
					move,
					canAdd,
					errors,
					invalid,
					// The scope hands out facts, never the tri-state `disabled` / `required` allow as
					// props — see the doc comment on `ArrayScope`.
					disabled: disabled ?? false,
					required: required ?? false,
					Button: components.Button,
					field,
				},
				frame,
			)}
		</ArrayKeyOrderContext.Provider>
	)
}
