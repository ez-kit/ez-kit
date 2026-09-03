'use client'

import { useState } from 'react'

import { Form, TextInputType } from 'shared/form/FormKit'

/**
 * The wizard from `wizard`, hand-rolled — because the JSX API has no `<Step>`.
 *
 * Steps exist only on the document side: `step` is a node type, and the kits ship the chrome
 * (stepper, Back/Next, the progress bar) that renders it. In JSX you write the state machine,
 * which is what this file is: one `useState` for the position, one `<Form>` around the whole
 * thing so nothing unmounts between steps, and the current step's fields rendered
 * conditionally.
 *
 * Note what the hand-rolled version quietly does *not* do. `visibleSteps` has to be
 * recomputed and renumbered by hand every time the account type changes. Next advances
 * without validating the step being left, so the user reaches the end before hearing about
 * an empty email — the document version scopes the form's validators to the step's own
 * fields on every Next, and there is no small amount of JSX that reproduces that. There is
 * also no stepper here at all; drawing one is more markup again.
 *
 * `withFieldGroup` would not help: it factors out a *reusable* group of fields bound to a
 * sub-path, and these three steps share nothing and sit at the root of the values. It would
 * add indirection and remove no work.
 */
const BUSINESS = 'business'

const ACCOUNT_TYPES = [
	{ label: 'Personal', value: 'personal' },
	{ label: 'Business', value: BUSINESS },
]

const PLANS = [
	{ label: 'Free', value: 'free' },
	{ label: 'Pro', value: 'pro' },
	{ label: 'Enterprise', value: 'enterprise' },
]

const ACCOUNT_STEP = 'account'
const COMPANY_STEP = 'company'
const PLAN_STEP = 'plan'

const STEP_TITLES: Record<string, string> = {
	[ACCOUNT_STEP]: 'Account',
	[COMPANY_STEP]: 'Company',
	[PLAN_STEP]: 'Plan',
}

/** The one thing the document says with `when` on a step, spelled as a filter. */
function visibleSteps(accountType: string): string[] {
	return accountType === BUSINESS ? [ACCOUNT_STEP, COMPANY_STEP, PLAN_STEP] : [ACCOUNT_STEP, PLAN_STEP]
}

const NAV_BUTTON_CLASS =
	'rounded-md border px-3 py-1.5 text-sm disabled:pointer-events-none disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/10'

export function WizardJsxExample() {
	// The step's *name*, not its position: the visible list is re-filtered whenever the
	// account type changes, and a stored index would silently point at another step.
	const [step, setStep] = useState<string>(ACCOUNT_STEP)
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={{
					accountType: 'personal',
					email: '',
					password: '',
					companyName: '',
					vatId: '',
					plan: 'pro',
					seats: 5,
					terms: false,
				}}
				onSubmit={({ value }) => {
					setSaved(JSON.stringify(value, null, 2))
				}}
			>
				{(form) => (
					<form.Subscribe selector={(state) => state.values.accountType}>
						{(accountType) => {
							const steps = visibleSteps(accountType)
							// The step on screen may have just vanished — the user picked "Personal"
							// while standing on Company. Fall back to the first one.
							const position = Math.max(0, steps.indexOf(step))
							const current = steps[position] ?? ACCOUNT_STEP
							const isLast = position === steps.length - 1

							return (
								<>
									<p className='text-sm font-medium'>
										Step {position + 1} of {steps.length} — {STEP_TITLES[current]}
									</p>

									{current === ACCOUNT_STEP && (
										<>
											<form.RadioGroupField
												name='accountType'
												label='Account type'
												options={ACCOUNT_TYPES}
											/>
											<form.TextField
												name='email'
												label='Email'
												placeholder='you@example.com'
												type={TextInputType.Email}
												required
											/>
											<form.TextField
												name='password'
												label='Password'
												type={TextInputType.Password}
												required
											/>
										</>
									)}

									{current === COMPANY_STEP && (
										<>
											<form.TextField
												name='companyName'
												label='Company name'
												required
											/>
											<form.TextField
												name='vatId'
												label='VAT id'
												placeholder='DE123456789'
											/>
										</>
									)}

									{current === PLAN_STEP && (
										<>
											<form.SelectField
												name='plan'
												label='Plan'
												options={PLANS}
												placeholder='Pick a plan'
											/>
											<form.SliderField
												name='seats'
												label='Seats'
												min={1}
												max={50}
												step={1}
											/>
											<form.CheckboxField
												name='terms'
												label='I accept the terms'
											/>
										</>
									)}

									<div className='flex items-center justify-between gap-2'>
										<button
											type='button'
											className={NAV_BUTTON_CLASS}
											disabled={position === 0}
											onClick={() => {
												const previous = steps[position - 1]
												if (previous !== undefined) setStep(previous)
											}}
										>
											Back
										</button>

										{isLast ? (
											<form.SubmitButton>Create account</form.SubmitButton>
										) : (
											<button
												type='button'
												className={NAV_BUTTON_CLASS}
												onClick={() => {
													const next = steps[position + 1]
													if (next !== undefined) setStep(next)
												}}
											>
												Next
											</button>
										)}
									</div>
								</>
							)
						}}
					</form.Subscribe>
				)}
			</Form>

			{saved === null ? null : <pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{saved}</pre>}
		</div>
	)
}
