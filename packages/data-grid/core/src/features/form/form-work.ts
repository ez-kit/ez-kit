import { CommitStatus, runValidator } from '../validation'

import { abortChecks } from './commit-pipeline'

import type { FormWorkBox } from './commit-pipeline'
import type { ValidateConfig, ValidationErrors, ValidationResult } from '../validation'

export function isAbortError(error: unknown): boolean {
	return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError'
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException('Aborted', 'AbortError'))
			return
		}
		const onAbort = (): void => {
			clearTimeout(timer)
			signal.removeEventListener('abort', onAbort)
			reject(new DOMException('Aborted', 'AbortError'))
		}
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort)
			resolve()
		}, ms)
		signal.addEventListener('abort', onAbort)
	})
}

/** A save supersedes field validation; a blur must never cancel a save. */
export function beginFormWork(box: FormWorkBox): AbortController {
	box.form?.abort()
	box.field?.abort()
	box.field = undefined
	const controller = new AbortController()
	box.form = controller
	return controller
}

export function beginFieldValidation(box: FormWorkBox, status: CommitStatus): AbortController | undefined {
	if (status !== CommitStatus.Idle) return undefined
	box.field?.abort()
	const controller = new AbortController()
	box.field = controller
	return controller
}

/** A form closes, a new one opens, or the table resets. */
export function abortFormWork(box: FormWorkBox): void {
	box.form?.abort()
	box.field?.abort()
	abortChecks(box)
	box.form = undefined
	box.field = undefined
	box.commit = undefined
}

type FieldValidationRun = {
	signal: AbortSignal
	columnId: string
	validate: ValidateConfig<never> | undefined
	values: Record<string, unknown>
	writeErrors: (update: (errors: ValidationErrors) => ValidationErrors) => void
}

/** Only the field's errors change. Form status belongs to commit/validate. */
export async function runFieldValidation({
	signal,
	columnId,
	validate,
	values,
	writeErrors,
}: FieldValidationRun): Promise<void> {
	if (signal.aborted || !validate) return
	let result: ValidationResult
	try {
		result = await runValidator(validate, values, { signal, cell: { columnId } })
	} catch (error) {
		if (isAbortError(error)) return
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (signal.aborted) return
		throw error
	}
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (signal.aborted) return
	writeErrors((errors) => {
		const { [columnId]: _removed, ...rest } = errors
		const fieldErrors = result?.errors?.[columnId]
		return fieldErrors && fieldErrors.length > 0 ? { ...rest, [columnId]: fieldErrors } : rest
	})
}

export function scheduleFieldValidation(
	box: FormWorkBox,
	status: CommitStatus,
	ms: number,
	validate: (signal: AbortSignal) => Promise<void>,
): void {
	const controller = beginFieldValidation(box, status)
	if (!controller) return
	void (async () => {
		try {
			await abortableSleep(ms, controller.signal)
			if (!controller.signal.aborted) await validate(controller.signal)
		} catch (error) {
			if (!isAbortError(error)) throw error
		}
	})()
}
