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
 * `Grid.Item`; a `Grid.Item` wraps *anything*, the nested `Section` below included; and the
 * nested section holds a four-column grid of its own inside a cell of the outer three.
 */
export function LayoutExample() {
	return (
		<Form defaultValues={DEFAULTS}>
			{(form) => (
				<>
					<form.Section
						title='Company'
						description='Three columns — the name takes two of them.'
					>
						<form.Grid columns={3}>
							<form.Grid.Item colSpan={2}>
								<form.TextField
									name='company'
									label='Company'
									placeholder='Ada Systems GmbH'
								/>
							</form.Grid.Item>
							<form.TextField
								name='vatId'
								label='VAT id'
								placeholder='DE123456789'
							/>

							<form.Grid.Item colSpan={3}>
								<form.Section title='Billing address'>
									<form.Grid columns={4}>
										<form.Grid.Item colSpan={3}>
											<form.TextField
												name='street'
												label='Street'
											/>
										</form.Grid.Item>
										<form.TextField
											name='zip'
											label='ZIP'
										/>
										<form.Grid.Item colSpan={2}>
											<form.TextField
												name='city'
												label='City'
											/>
										</form.Grid.Item>
										<form.Grid.Item colSpan={2}>
											<form.SelectField
												name='country'
												label='Country'
												options={COUNTRIES}
											/>
										</form.Grid.Item>
									</form.Grid>
								</form.Section>
							</form.Grid.Item>

							<form.Grid.Item colSpan={3}>
								<form.TextareaField
									name='notes'
									label='Delivery notes'
									rows={2}
								/>
							</form.Grid.Item>
						</form.Grid>
					</form.Section>

					<form.Section title='Contact'>
						<form.Grid columns={2}>
							<form.TextField
								name='contactName'
								label='Name'
							/>
							<form.TextField
								name='contactEmail'
								label='Email'
							/>
						</form.Grid>
					</form.Section>

					<form.SubmitButton>Save</form.SubmitButton>
				</>
			)}
		</Form>
	)
}
