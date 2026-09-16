import { formatFieldErrors } from '@ez-kit/form-core'
import { createContext, useCallback, useContext, useRef } from 'react'

import { fieldValidators } from '../field-validate'

import type { BindableForm, BoundFieldApi } from '../bindable-form'
import type { ArrayFieldRenderProps, FormComponents } from '../contract'
import type { ArrayFieldProps, ArrayItemScope, FormFieldComponents } from '../field-props'
import type { FieldValidateProps } from '../field-validate'
import type { ReactNode } from 'react'

const ARRAY_FIELD_TYPE = 'array'

/**
 * The array entry the fields below are currently being rendered for, as an absolute path
 * (`people[1]`), or `undefined` at the form root.
 *
 * A context rather than a closure, and that is the whole trick. The scoped components are built
 * **once** per array field, so their identities never change; only this value does. Rebuilding
 * them per item would give every entry fresh component identities, and removing an entry from
 * the middle would then remount every entry after it — losing focus, an open calendar, a
 * half-typed search query. Changing only the value lets React keep the tree mounted while each
 * field's `name` changes underneath it, which TanStack's `useField` handles by design.
 */
const ArrayItemPathContext = createContext<string | undefined>(undefined)

/** The entry path a field sits in, or `undefined` outside any array. */
export function useArrayItemPath(): string | undefined {
	return useContext(ArrayItemPathContext)
}

/**
 * Wraps one field component so its `name` prop is read as **item-relative** and handed on
 * resolved.
 *
 * Resolving here rather than inside `form.AppField` is what keeps the rest of the package
 * untouched: the wrapped component receives a fully absolute name, so its `AppField`, its
 * `fieldValidators` and the option-source plumbing's `setFieldValue` all address the right path
 * without knowing arrays exist.
 */
function scopeComponent<TProps extends { name: string }>(
	Inner: (props: TProps) => ReactNode,
): (props: TProps) => ReactNode {
	return function Scoped(props: TProps): ReactNode {
		const prefix = useArrayItemPath()
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

	const onRemove = useCallback((index: number) => {
		keysRef.current.splice(index, 1)
	}, [])

	const onMove = useCallback((from: number, to: number) => {
		const [moved] = keysRef.current.splice(from, 1)
		if (moved !== undefined) keysRef.current.splice(to, 0, moved)
	}, [])

	return { keys: keysRef.current, onAdd, onRemove, onMove }
}

/** Build the `ArrayField` component bound to one form instance. */
export function createArrayField<TFormData>(
	form: BindableForm,
	components: FormComponents,
	fieldComponents: FormFieldComponents<TFormData>,
): FormFieldComponents<TFormData>['ArrayField'] {
	const { ArrayField: KitArrayField, ArrayItem: KitArrayItem } = components

	// Built once for the whole form, so identities are stable for every array and every entry.
	// The record is the same object the form already exposes; only its *type* is reinterpreted,
	// because inside an entry the same components address the item's paths rather than the
	// form's. The runtime does not change, which is why this is a cast and not a rebuild.
	const scoped = Object.fromEntries(
		Object.entries(fieldComponents).map(([key, Component]) => [
			key,
			scopeComponent(Component as (props: { name: string }) => ReactNode),
		]),
	) as unknown as FormFieldComponents<unknown>

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
						KitArrayItem={KitArrayItem}
						scoped={scoped}
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
	onRemove: () => void
	onMoveUp: (() => void) | undefined
	onMoveDown: (() => void) | undefined
}

/** The frame `ArrayField` renders around the entries — everything but the entries themselves. */
type ArrayFrameProps = Omit<ArrayFieldRenderProps, 'children'>

type ArrayBodyProps = {
	field: BoundFieldApi
	fieldName: string
	KitArrayItem: FormComponents['ArrayItem']
	scoped: FormFieldComponents<unknown>
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
	render: (
		scope: { items: readonly ArrayItemScope<unknown>[]; add: () => void; canAdd: boolean },
		frame: ArrayFrameProps,
	) => ReactNode
}

function ArrayBody({
	field,
	fieldName,
	KitArrayItem,
	scoped,
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
	const list = Array.isArray(field.state.value) ? (field.state.value as readonly unknown[]) : []
	const keys = useItemKeys(list.length)

	// Read during render, never subscribed to: the per-key components below re-render because
	// their parent does and their `children` change, so a ref is enough to hand them fresh data
	// without giving them a new identity.
	const itemDataRef = useRef(new Map<string, ItemData>())
	const itemComponentsRef = useRef(new Map<string, (props: { children: ReactNode }) => ReactNode>())

	const write = (next: readonly unknown[]): void => {
		field.handleChange(next)
	}

	const add = (): void => {
		keys.onAdd()
		write([...list, newItem])
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
	const componentFor = (key: string): ((props: { children: ReactNode }) => ReactNode) => {
		const existing = itemComponentsRef.current.get(key)
		if (existing !== undefined) return existing

		const Item = ({ children: itemChildren }: { children: ReactNode }): ReactNode => {
			const data = itemDataRef.current.get(key)
			if (data === undefined) return null
			return (
				<ArrayItemPathContext.Provider value={data.path}>
					<KitArrayItem
						data-index={data.index}
						index={data.index}
						label={data.label}
						removeLabel={data.removeLabel}
						moveUpLabel={data.moveUpLabel}
						moveDownLabel={data.moveDownLabel}
						disabled={data.disabled}
						onRemove={data.onRemove}
						onMoveUp={data.onMoveUp}
						onMoveDown={data.onMoveDown}
					>
						{itemChildren}
					</KitArrayItem>
				</ArrayItemPathContext.Provider>
			)
		}
		itemComponentsRef.current.set(key, Item)
		return Item
	}

	// `true` and the object form both mean "offer reordering"; the object only adds captions.
	const canReorder = reorderable !== undefined && reorderable !== false
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
			onRemove: () => {
				remove(index)
			},
			onMoveUp:
				canReorder && index > 0
					? () => {
							move(index, index - 1)
						}
					: undefined,
			onMoveDown:
				canReorder && index < list.length - 1
					? () => {
							move(index, index + 1)
						}
					: undefined,
		})
		return { ...scoped, key, index, Item: componentFor(key) }
	})

	// Entries that are gone take their cached component with them, or the maps would grow for
	// the form's whole life.
	for (const key of itemComponentsRef.current.keys()) {
		if (keys.keys.includes(key)) continue
		itemComponentsRef.current.delete(key)
		itemDataRef.current.delete(key)
	}

	const errors = field.state.meta.isTouched ? formatFieldErrors(field.state.meta.errors) : []
	const { maxLength } = validate ?? {}
	const canAdd = maxLength === undefined || list.length < maxLength

	const frame: ArrayFrameProps = {
		'data-field': field.name,
		'data-field-type': ARRAY_FIELD_TYPE,
		name: field.name,
		label,
		description,
		errors,
		invalid: errors.length > 0,
		disabled,
		required,
		addLabel: addLabel ?? DEFAULT_ADD_LABEL,
		onAdd: add,
		canAdd,
	}

	return render({ items, add, canAdd }, frame)
}
