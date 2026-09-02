'use client'

import { Form } from 'shared/form/FormKit'

/**
 * A tag vocabulary that is a *suggestion*, not a constraint.
 *
 * Written out inline, with no option source anywhere — which is the second half of what this
 * example shows. A `searchable` field used to require `optionsFrom`; a static list is now
 * filtered in the renderer instead, by one fixed rule (a case-insensitive substring of the
 * label) and with no configuration. Anything more particular than that is what an option
 * source is for.
 */
const TAGS = [
	{ label: 'Bug', value: 'bug' },
	{ label: 'Chore', value: 'chore' },
	{ label: 'Documentation', value: 'docs' },
	{ label: 'Performance', value: 'perf' },
	{ label: 'Refactor', value: 'refactor' },
	{ label: 'Regression', value: 'regression' },
]

/**
 * `creatable`: the list suggests, the user decides.
 *
 * Type something the list does not contain — "flaky", say — and one extra row appears at the
 * bottom offering to add it. Picking that row is what writes the typed text into form state;
 * nothing is committed by blurring or by typing alone, which is the same explicit act
 * react-select and react-admin ask for.
 *
 * The value is then a plain string that was never on any list. Submit and look: `tags` holds
 * `"flaky"` next to `"bug"`, and the chip reads "flaky" rather than a blank. That is the whole
 * feature — a created value labels itself, because the value *is* the text that was typed.
 *
 * Neither UI kit knows any of this happened. The offered row reaches them as an ordinary
 * option, so both kits render it with the code they already had.
 */
export function CreatableExample() {
	return (
		<Form defaultValues={{ primary: 'bug', tags: ['docs'] }}>
			{(form) => (
				<>
					<form.SelectField
						name='primary'
						label='Primary tag'
						description='Search the list, or type a tag of your own and pick the "Add …" row.'
						placeholder='Search tags'
						searchable
						creatable
						options={TAGS}
					/>
					<form.MultiSelectField
						name='tags'
						label='All tags'
						description='The same on a multi-value field: created tags become chips labelled by their own text.'
						placeholder='Search tags'
						searchable
						creatable
						createLabel='Add this as a new tag'
						options={TAGS}
					/>
					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}
