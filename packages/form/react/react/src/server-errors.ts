import type { DeepKeys } from '@tanstack/form-core'

/** One message, or several, for a field or for the form. */
export type ServerErrorMessages = string | readonly string[]

/** Errors a server reported, by field path, plus messages for the form as a whole. */
export type ServerErrors<TFormData> = {
	fields?: { [TName in DeepKeys<TFormData>]?: ServerErrorMessages | undefined } | undefined
	form?: ServerErrorMessages | undefined
}

/** The server errors of one form instance — see {@link attachServerErrors}. */
export type ServerErrorsController = {
	/** Replace every server error with `errors`; returns whether they named at least one field. */
	apply: (errors: ServerErrors<unknown>) => boolean
	/** Remove every server error. */
	clear: () => void
	/** The current form-level messages; the same array until they change. */
	formErrors: () => readonly string[]
	/** Listen for a change of the form-level messages; returns the unsubscribe. */
	subscribe: (listener: () => void) => () => void
	/** Re-assert the slots on every store change; returns the disconnect. */
	connect: () => () => void
}

/** The slice of a field's meta the controller reads and writes; the rest is carried through. */
type FieldMetaLike = { isTouched: boolean; errorMap: Record<string, unknown> }

/** A `fieldInfo` entry: `instance` is set while the field is mounted and `null` once it unmounts. */
type FieldInfoLike = { instance: unknown }

/** The members of TanStack's instance the controller reads and wraps. */
export type ServerErrorsHost = {
	fieldInfo: Partial<Record<string, FieldInfoLike>>
	getFieldValue: (name: string) => unknown
	getFieldMeta: (name: string) => FieldMetaLike | undefined
	setFieldMeta: (name: string, updater: (prev: FieldMetaLike) => FieldMetaLike) => void
	handleSubmit: (...args: never[]) => Promise<void>
	reset: (...args: never[]) => void
	store: { subscribe: (listener: () => void) => { unsubscribe: () => void } }
}

type FieldEntry = { messages: readonly string[]; value: unknown }

const NO_MESSAGES: readonly string[] = []

function toMessages(messages: ServerErrorMessages | undefined): readonly string[] {
	if (messages === undefined) return NO_MESSAGES
	return (typeof messages === 'string' ? [messages] : messages).filter((message) => message !== '')
}

function sameMessages(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((message, index) => message === b[index])
}

const controllers = new WeakMap<object, ServerErrorsController>()

/** The controller of a form `attachServerErrors` was called on; `form.Submit` reads it. */
export function serverErrorsOf(form: object): ServerErrorsController | undefined {
	return controllers.get(form)
}

/**
 * The server errors of one form instance.
 *
 * TanStack stores a field's server error in `errorMap.onServer` but clears that slot
 * inconsistently — never without a field validator, on blur with one, not on a first submit — so
 * this controller decides when an error appears and goes, and re-asserts the slot after every store
 * change. Form-level messages stay here, not in `errorMap`: there they would make `canSubmit` false
 * with nothing but a submit to clear them, and the kits disable submitting while `canSubmit` is false.
 *
 * For the same reason a slot is written only while its field is **mounted** (R49): TanStack derives
 * `canSubmit` from the meta of every field it knows, so a slot on a field nobody can see or edit
 * would disable submitting invisibly. The entry stays here, and the slot is written when the field
 * mounts and cleared when it unmounts. Mounting is not always a store change — a field that comes
 * back keeps its meta — so the controller watches the field's `fieldInfo.instance`, which TanStack
 * sets on mount and nulls on unmount (after resetting the meta, which is why a slot re-asserted in
 * between is cleared again there).
 *
 * Idempotent per instance, so React's double memo in StrictMode gets the same controller.
 */
export function attachServerErrors(host: ServerErrorsHost): ServerErrorsController {
	const existing = controllers.get(host)
	if (existing !== undefined) return existing

	let fields: ReadonlyMap<string, FieldEntry> = new Map()
	let formMessages: readonly string[] = NO_MESSAGES
	// The names whose `onServer` slot this controller wrote and has not cleared yet.
	let owned: ReadonlySet<string> = new Set()
	let listeners: ReadonlySet<() => void> = new Set()
	let syncing = false
	const watched = new WeakSet<FieldInfoLike>()

	const notify = (): void => {
		for (const listener of listeners) listener()
	}

	// A written error marks the field touched, or the display rule would hide it (R38).
	const writeSlot = (name: string, messages: readonly string[] | undefined): void => {
		host.setFieldMeta(name, (prev) => ({
			...prev,
			...(messages !== undefined && { isTouched: true }),
			errorMap: { ...prev.errorMap, onServer: messages },
		}))
	}

	const isMounted = (name: string): boolean => Boolean(host.fieldInfo[name]?.instance)

	// Writes made while `syncing` notify the store again; the flag keeps them from re-entering.
	const withoutSync = (write: () => void): void => {
		syncing = true
		try {
			write()
		} finally {
			syncing = false
		}
	}

	/**
	 * Make every slot match the entries: written, by identity, for a mounted field with an entry;
	 * cleared for an owned one that no longer has an entry or is no longer mounted. A field whose
	 * meta TanStack has not created yet is left to the store change that creates it.
	 */
	const reconcile = (): void => {
		withoutSync(() => {
			const nextOwned = new Set<string>()
			for (const name of new Set([...owned, ...fields.keys()])) {
				watchMounting(name)
				const meta = host.getFieldMeta(name)
				if (meta === undefined) continue
				const wanted = isMounted(name) ? fields.get(name)?.messages : undefined
				if (meta.errorMap.onServer !== wanted && (wanted !== undefined || owned.has(name))) {
					writeSlot(name, wanted)
				}
				if (wanted !== undefined) nextOwned.add(name)
			}
			owned = nextOwned
		})
	}

	const sync = (): void => {
		if (syncing) return
		fields = new Map([...fields].filter(([name, entry]) => Object.is(host.getFieldValue(name), entry.value)))
		reconcile()
	}

	/** Re-sync when the field's `fieldInfo` entry gets or loses its instance — see the docblock above. */
	function watchMounting(name: string): void {
		const info = host.fieldInfo[name]
		if (info === undefined || watched.has(info)) return
		watched.add(info)
		let instance = info.instance
		Object.defineProperty(info, 'instance', {
			configurable: true,
			enumerable: true,
			get: () => instance,
			set: (next: unknown) => {
				instance = next
				sync()
			},
		})
	}

	const controller: ServerErrorsController = {
		apply(errors) {
			const nextFields = new Map<string, FieldEntry>()
			const entries: [string, ServerErrorMessages | undefined][] = Object.entries(errors.fields ?? {})
			for (const [name, messages] of entries) {
				const list = toMessages(messages)
				if (list.length > 0) nextFields.set(name, { messages: list, value: host.getFieldValue(name) })
			}
			fields = nextFields
			reconcile()
			const nextForm = toMessages(errors.form)
			if (!sameMessages(nextForm, formMessages)) {
				formMessages = nextForm
				notify()
			}
			return nextFields.size > 0
		},
		clear() {
			void controller.apply({})
		},
		formErrors: () => formMessages,
		subscribe(listener) {
			listeners = new Set([...listeners, listener])
			return () => {
				listeners = new Set([...listeners].filter((entry) => entry !== listener))
			}
		},
		connect() {
			const subscription = host.store.subscribe(sync)
			return () => {
				subscription.unsubscribe()
			}
		},
	}

	// Both are own properties of TanStack's React instance (`useForm` builds `handleSubmit` and
	// spreads `reset` from the core instance), so replacing them here is what the app calls.
	const { handleSubmit, reset } = host
	Object.assign(host, {
		handleSubmit: (...args: Parameters<typeof handleSubmit>) => {
			controller.clear()
			return handleSubmit(...args)
		},
		reset: (...args: Parameters<typeof reset>) => {
			controller.clear()
			reset(...args)
		},
	})
	controllers.set(host, controller)
	return controller
}
