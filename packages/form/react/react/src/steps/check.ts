import { focusesOnError, focusFirstFieldWithErrors } from '../focus-first-error'
import { hasOwnErrorsIn, validateGroups } from '../group-registry'
import { ScopeCause } from '../validated-scope'

import type { GroupHost, ValidatedGroup } from '../group-registry'
import type { StepCheck, StepsController } from './controller'

/** A mounted field, at the one member a step check calls. */
type CheckedInstance = {
	validate: (cause: typeof ScopeCause.Submit, options: { skipFormValidation: boolean }) => unknown
}

type CheckedMeta = { isTouched: boolean; errors: readonly unknown[] }

/** The members of the form a step check reads and writes. */
export type CheckHost = GroupHost & {
	formId: string
	fieldInfo: Partial<Record<string, { instance: CheckedInstance | null }>>
	getFieldMeta: (name: string) => CheckedMeta | undefined
	setFieldMeta: (name: string, updater: (prev: CheckedMeta) => CheckedMeta) => void
	validate: (
		cause: typeof ScopeCause.Submit,
		options: { filterFieldNames: (name: string) => boolean; dontUpdateFormErrorMap: boolean },
	) => unknown
}

/** Whether a step's fields have no errors now — what a forward jump over it asks. */
export function createStepClean(form: CheckHost, controller: StepsController): (step: string) => boolean {
	return (step) =>
		(controller.store.get().fields[step] ?? []).every((name) => (form.getFieldMeta(name)?.errors.length ?? 0) === 0)
}

/**
 * The check `goNext` runs on a step — a submit of the step, as a group submit is of its branch.
 *
 * The step's fields are marked touched, as a submit marks every field, so their errors show. The sync
 * layer runs first: each field's own validators, the form's validators limited to the step's fields,
 * the groups the step registered, and the step's own sync validators. Only when all of those passed do
 * the step's async validators run, so a server is never asked about data already known to be wrong.
 * The verdict reads the step's fields, its groups' own errors and its own: errors the form reports on
 * other steps' fields neither block it nor show.
 */
export function createStepCheck(form: CheckHost, controller: StepsController): StepCheck {
	return async (step) => {
		const fields = controller.store.get().fields[step] ?? []
		const inStep = (name: string): boolean => fields.includes(name)
		const groups = controller.groupsOf(step)
		const inStepGroup = (group: ValidatedGroup): boolean => groups.has(group.owner)
		const fieldsClean = (): boolean => fields.every((name) => (form.getFieldMeta(name)?.errors.length ?? 0) === 0)

		for (const name of fields) {
			form.setFieldMeta(name, (prev) => (prev.isTouched ? prev : { ...prev, isTouched: true }))
		}
		await Promise.all(
			fields.map(async (name) => {
				await form.fieldInfo[name]?.instance?.validate(ScopeCause.Submit, { skipFormValidation: true })
			}),
		)
		// The form's verdict is not touched: TanStack would record the whole schema's result in it, the
		// steps ahead included, and with a schema on `onDynamic` nothing recomputes it before the submit
		// — the submit button would stay disabled over fields the user has not reached yet.
		await form.validate(ScopeCause.Submit, { filterFieldNames: inStep, dontUpdateFormErrorMap: true })
		await validateGroups(form, inStepGroup)

		const scope = controller.scopeOf(step)
		const syncClean = fieldsClean() && !hasOwnErrorsIn(form, inStepGroup)
		// A pass cancelled with nothing replacing it — the step stopped applying, the form was reset — left
		// its slots empty, which would read as clean; it did not run, so the step did not pass.
		const ran = scope === undefined ? true : await scope.run(ScopeCause.Submit, { async: syncClean })

		const passed = ran && fieldsClean() && !hasOwnErrorsIn(form, inStepGroup) && (scope?.isClean() ?? true)
		if (!passed && focusesOnError(form)) focusFirstFieldWithErrors(form, inStep)
		return passed
	}
}
