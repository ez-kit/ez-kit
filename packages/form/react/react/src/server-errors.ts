import type { DeepKeys } from '@tanstack/form-core'

/** One message, or several, for a field or for the form. */
export type ServerErrorMessages = string | readonly string[]

/** Errors a server reported, by field path, plus messages for the form as a whole. */
export type ServerErrors<TFormData> = {
	fields?: { [TName in DeepKeys<TFormData>]?: ServerErrorMessages }
	form?: ServerErrorMessages
}

/** The server errors of one form instance — see {@link attachServerErrors}. */
export type ServerErrorsController = {
	/** Replace every server error with `errors`. */
	apply: (errors: ServerErrors<unknown>) => void
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

/** The members of TanStack's instance the controller reads and wraps. */
export type ServerErrorsHost = {
	getFieldValue: (name: string) => unknown
	getFieldMeta: (name: string) => FieldMetaLike | undefined
	setFieldMeta: (name: string, updater: (prev: FieldMetaLike | undefined) => FieldMetaLike) => void
	handleSubmit: (...args: never[]) => Promise<void>
	reset: (...args: never[]) => void
	store: { subscribe: (listener: () => void) => { unsubscribe: () => void } }
}

type FieldEntry = { messages: readonly string[]; value: unknown }

const NO_MESSAGES: readonly string[] = []

/**
 * The base meta of a field TanStack has not created yet — a copy of its own (unexported)
 * `defaultFieldMeta`, minus what it derives. A field named in the errors before it mounts gets
 * its meta from here (R41); when it mounts, TanStack keeps a meta that already exists.
 */
const UNMOUNTED_FIELD_META = {
	isValidating: false,
	isTouched: false,
	isBlurred: false,
	isDirty: false,
	errorMap: {},
	errorSourceMap: {},
	_arrayVersion: 0,
	_pendingValidationsCount: 0,
}

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

	const notify = (): void => {
		for (const listener of listeners) listener()
	}

	const writeSlot = (name: string, messages: readonly string[] | undefined, touch: boolean): void => {
		host.setFieldMeta(name, (prev = UNMOUNTED_FIELD_META) => ({
			...prev,
			...(touch && { isTouched: true }),
			errorMap: { ...prev.errorMap, onServer: messages },
		}))
	}

	// Writes made while `syncing` notify the store again; the flag keeps them from re-entering.
	const withoutSync = (write: () => void): void => {
		syncing = true
		try {
			write()
		} finally {
			syncing = false
		}
	}

	const sync = (): void => {
		if (syncing) return
		withoutSync(() => {
			fields = new Map([...fields].filter(([name, entry]) => Object.is(host.getFieldValue(name), entry.value)))
			for (const name of owned) {
				const wanted = fields.get(name)?.messages
				if (host.getFieldMeta(name)?.errorMap.onServer !== wanted) writeSlot(name, wanted, false)
			}
			owned = new Set([...owned].filter((name) => fields.has(name)))
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
			withoutSync(() => {
				for (const name of owned) if (!nextFields.has(name)) writeSlot(name, undefined, false)
				for (const [name, entry] of nextFields) writeSlot(name, entry.messages, true)
			})
			fields = nextFields
			owned = new Set(nextFields.keys())
			const nextForm = toMessages(errors.form)
			if (sameMessages(nextForm, formMessages)) return
			formMessages = nextForm
			notify()
		},
		clear() {
			controller.apply({})
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
