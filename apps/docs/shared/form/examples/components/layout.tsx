'use client'

import { Form } from 'shared/form/FormKit'

const COUNTRIES = [
	{ label: 'Germany', value: 'de' },
	{ label: 'Netherlands', value: 'nl' },
	{ label: 'Poland', value: 'pl' },
]

const DEFAULTS = {
	company: '',
	vatId: '',
	street: '',
	zip: '',
	city: '',
	country: 'de',
	notes: '',
	contactName: '',
	contactEmail: '',
}

/**
 * Sections and spans written in JSX — the twin of `layout-schema`, down to the grid.
 *
 * Three things worth reading off it: an unwrapped child occupies one column and needs no
 * `GridItem`; a `GridItem` wraps *anything*, the nested `Section` below included; and the
 * nested section starts a four-column grid of its own inside a cell of the outer three.
 */
export function LayoutExample() {
	return (
		<Form defaultValues={DEFAULTS}>
			{(form) => (
				<>
					<form.Section
						title='Company'
						description='Three columns — the name takes two of them.'
						columns={3}
					>
						<form.GridItem colSpan={2}>
							<form.TextField
								name='company'
								label='Company'
								placeholder='Ada Systems GmbH'
							/>
						</form.GridItem>
						<form.TextField
							name='vatId'
							label='VAT id'
							placeholder='DE123456789'
						/>

						<form.GridItem colSpan={3}>
							<form.Section
								title='Billing address'
								columns={4}
							>
								<form.GridItem colSpan={3}>
									<form.TextField
										name='street'
										label='Street'
									/>
								</form.GridItem>
								<form.TextField
									name='zip'
									label='ZIP'
								/>
								<form.GridItem colSpan={2}>
									<form.TextField
										name='city'
										label='City'
									/>
								</form.GridItem>
								<form.GridItem colSpan={2}>
									<form.SelectField
										name='country'
										label='Country'
										options={COUNTRIES}
									/>
								</form.GridItem>
							</form.Section>
						</form.GridItem>

						<form.GridItem colSpan={3}>
							<form.TextareaField
								name='notes'
								label='Delivery notes'
								rows={2}
							/>
						</form.GridItem>
					</form.Section>

					<form.Section
						title='Contact'
						columns={2}
					>
						<form.TextField
							name='contactName'
							label='Name'
						/>
						<form.TextField
							name='contactEmail'
							label='Email'
						/>
					</form.Section>

					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}
