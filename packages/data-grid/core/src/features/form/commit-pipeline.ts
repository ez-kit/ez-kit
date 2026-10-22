import { runValidator } from '../validation/schema-resolver'
import { CommitStatus, isValidationError } from '../validation/validation-types'

import type {
	ValidateConfig,
	ValidateContext,
	ValidationErrors,
	ValidationProblems,
	ValidationResult,
} from '../validation/validation-types'

/**
 * Why a `commit` did not save.
 *
 * Named members for internal reference; the result carries the plain string union, so
 * `result.reason === 'rejected'` is equally valid and needs no import.
 */
export const CommitFailure = {
	/** The validator or a `ValidationError` from `onSave` refused the values; `errors` say why. */
	Rejected: 'rejected',
	/** `cancel()`, a new `start()` or a table reset abandoned the save. Nothing was written. */
	Cancelled: 'cancelled',
	/** Another form operation — a `validate()` — was running; nothing was attempted. */
	Busy: 'busy',
	/** No form was open, or the feature has no config; nothing was attempted. */
	Closed: 'closed',
} as const

export type CommitFailure = (typeof CommitFailure)[keyof typeof CommitFailure]

/**
 * What a `commit` resolves to.
 *
 * A refused save is a result, not an exception, so a form of one's own can react without reading
 * the table's state. Only `rejected` carries errors — the ones the form now shows; the other
 * failures attempted nothing and have nothing to show. An error the grid cannot interpret —
 * anything but a `ValidationError` from `onSave`, or a throw from the validator itself — still
 * rejects the promise.
 */
export type CommitResult =
	| { readonly ok: true }
	| {
			readonly ok: false
			readonly reason: typeof CommitFailure.Rejected
			readonly errors: ValidationErrors
			readonly formError: string | null
	  }
	| {
			readonly ok: false
			readonly reason: typeof CommitFailure.Cancelled | typeof CommitFailure.Busy | typeof CommitFailure.Closed
	  }

/**
 * Options of `creating.commit` / `editing.commit`.
 *
 * `values` replaces — not merges into — the form's values in the slice before the pipeline runs,
 * so a form that keeps its own state hands them over in one call and the grid's errors, `isPending`
 * and `formError` still describe the save. Keys no column declares are kept and reach `onSave`
 * unchanged — which is why the values are a plain record rather than `Partial<TRow>`.
 *
 * A call made while a save is in flight resolves to that save's outcome, and its `values` are
 * ignored: the save in flight already has the values it is sending.
 */
export type CommitOptions = {
	values?: Record<string, unknown>
}

/** The four slice fields the pipeline writes — common to `creating` and `editing`. */
type CommitSlicePatch = {
	errors?: ValidationErrors
	formError?: string | null
	commitStatus?: CommitStatus
}

/**
 * The per-table box each form feature keeps its in-flight work in. See `CreatingAbortBox` /
 * `EditingAbortBox`, which are this shape.
 */
export type FormWorkBox = {
	/** `commit`, `commitCell` and `validate` — whatever owns the form as a whole. */
	form?: AbortController | undefined
	/** `validateField` and the debounced change validation — one field, one blur, one keystroke. */
	field?: AbortController | undefined
	/**
	 * `validateValues` — a check that writes nothing. Shared by every such check while the form is
	 * open and aborted only when it closes, so a blur check in a form of one's own never cancels a
	 * save, and a save never cancels the check.
	 */
	check?: AbortController | undefined
	/** The commit in flight, handed back to a second `commit` call instead of starting another. */
	commit?: Promise<CommitResult> | undefined
}

const GENERIC_FORM_ERROR = 'Unexpected error'

const COMMIT_OK: CommitResult = { ok: true }
const COMMIT_CANCELLED: CommitResult = { ok: false, reason: CommitFailure.Cancelled }
const COMMIT_BUSY: CommitResult = { ok: false, reason: CommitFailure.Busy }
const COMMIT_CLOSED: CommitResult = { ok: false, reason: CommitFailure.Closed }

/** A commit that did not start because no form was open or the feature has no config. */
export function commitClosed(): Promise<CommitResult> {
	return Promise.resolve(COMMIT_CLOSED)
}

/**
 * A commit asked for while another form operation runs: the save in flight when there is one,
 * otherwise `busy` — a `validate()` holds the form, and nothing was attempted.
 */
export function commitInFlight(box: FormWorkBox): Promise<CommitResult> {
	return box.commit ?? Promise.resolve(COMMIT_BUSY)
}

function rejected(problems: { errors: ValidationErrors; formError: string | null }): CommitResult {
	return { ok: false, reason: CommitFailure.Rejected, ...problems }
}

/** What {@link untilSettledOrAborted} resolves to when the signal won. */
const ABORTED = Symbol('aborted')

/**
 * `work`, unless `signal` aborts first.
 *
 * A cancelled commit must settle when it is cancelled, not when an `onSave` that ignores its
 * `signal` eventually returns — or never does. A late rejection of `work` is marked handled here,
 * so it cannot surface as an unhandled rejection after the race was lost.
 */
function untilSettledOrAborted<T>(work: T | Promise<T>, signal: AbortSignal): Promise<T | typeof ABORTED> {
	const settled = Promise.resolve(work)
	settled.catch(() => undefined)
	if (signal.aborted) return Promise.resolve(ABORTED)
	let onAbort = (): void => undefined
	const aborted = new Promise<typeof ABORTED>((resolve) => {
		onAbort = () => {
			resolve(ABORTED)
		}
		signal.addEventListener('abort', onAbort, { once: true })
	})
	return Promise.race([settled, aborted]).finally(() => {
		signal.removeEventListener('abort', onAbort)
	})
}

/** How a validator's result becomes the errors the form shows. Row and modal forms keep all of it. */
function wholeForm(result: ValidationProblems): { errors: ValidationErrors; formError: string | null } {
	return { errors: result.errors ?? {}, formError: result.formError ?? null }
}

type CommitRun = {
	signal: AbortSignal
	values: Record<string, unknown>
	validate: ValidateConfig<never> | undefined
	validateContext: ValidateContext
	/** Narrows a validator's result to what this form shows — cell mode keeps one field. */
	toProblems?: (result: ValidationProblems) => { errors: ValidationErrors; formError: string | null }
	save: (signal: AbortSignal) => void | Promise<void>
	write: (patch: CommitSlicePatch) => void
	/** Closes the form after a successful save. */
	close: () => void
}

/**
 * Validate, then save — the pipeline every write form runs, whichever form collected the values.
 *
 * The caller has already claimed the form controller and set `commitStatus: Validating`. Every
 * exit writes the slice before it resolves, so the slice and the result never disagree.
 */
export async function runCommit(run: CommitRun): Promise<CommitResult> {
	const { signal } = run
	if (run.validate) {
		let result: ValidationResult | typeof ABORTED
		try {
			result = await untilSettledOrAborted(runValidator(run.validate, run.values, run.validateContext), signal)
		} catch (e) {
			if (signal.aborted) return COMMIT_CANCELLED
			run.write({ commitStatus: CommitStatus.Idle })
			throw e
		}
		if (result === ABORTED || signal.aborted) return COMMIT_CANCELLED
		if (result !== null) {
			const problems = (run.toProblems ?? wholeForm)(result)
			run.write({ ...problems, commitStatus: CommitStatus.Idle })
			return rejected(problems)
		}
	}

	run.write({ commitStatus: CommitStatus.Saving })
	let saved: unknown
	try {
		saved = await untilSettledOrAborted(run.save(signal), signal)
	} catch (e) {
		if (signal.aborted) return COMMIT_CANCELLED
		if (isValidationError(e)) {
			const problems = { errors: e.errors, formError: e.formError ?? null }
			run.write({ ...problems, commitStatus: CommitStatus.Idle })
			return rejected(problems)
		}
		run.write({ formError: GENERIC_FORM_ERROR, commitStatus: CommitStatus.Idle })
		throw e
	}
	if (saved === ABORTED || signal.aborted) return COMMIT_CANCELLED
	// Outside the `try`: once `onSave` has resolved the save happened, and a throw from closing
	// the form must not be reported as a failed save.
	run.close()
	return COMMIT_OK
}

/**
 * Remember `commit` as the one in flight until it settles, so a second call can be handed it.
 *
 * The bookkeeping chain swallows the rejection it observes; the caller still receives `commit`
 * itself, which rejects as it would have.
 */
export function trackCommit(box: FormWorkBox, commit: Promise<CommitResult>): Promise<CommitResult> {
	box.commit = commit
	const release = (): void => {
		if (box.commit === commit) box.commit = undefined
	}
	commit.then(release, release)
	return commit
}

/**
 * Run the validator over `values` without touching the slice — `validateValues`.
 *
 * Resolves `null` when no form is open, or when the form closed while the check ran: there is no
 * longer a form to report to. A caller that must tell that apart from "valid" checks whether the
 * form is still open.
 */
export async function checkValues(
	box: FormWorkBox,
	isOpen: boolean,
	validate: ValidateConfig<never> | undefined,
	values: Record<string, unknown>,
): Promise<ValidationResult> {
	if (!validate || !isOpen) return null
	const controller = (box.check ??= new AbortController())
	try {
		const result = await runValidator(validate, values, { signal: controller.signal })
		return controller.signal.aborted ? null : result
	} catch (e) {
		if (controller.signal.aborted) return null
		throw e
	}
}

/** End every `validateValues` check — the form closed. */
export function abortChecks(box: FormWorkBox): void {
	box.check?.abort()
	box.check = undefined
}
