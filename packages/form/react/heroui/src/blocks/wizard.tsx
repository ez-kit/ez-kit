import { Button as HeroButton, ProgressBar, Tabs } from '@heroui/react'

import type { WizardRenderProps, WizardStep } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The HeroUI Wizard chrome, assembled from `Tabs` (the step list) plus `ProgressBar` and
 * `Button` — neither kit ships a stepper (see `AGENTS.md`/task brief). Unlike the vendored
 * shadcn primitives, this package has no `components/ui/` layer (see `blocks/layout.tsx` for
 * why), so — hand-written like `blocks/layout.tsx` and `blocks/form-parts.tsx` — this lives
 * directly in `blocks/`.
 *
 * `Tabs.Tab`'s `isDisabled` is React Aria's real disabled state, not a styled-only
 * approximation: a disabled step is unfocusable and unclickable, exactly like the shadcn
 * kit's native `disabled` button.
 *
 * `WizardStep.title`/`description` are `LocalizedText`, not `ReactNode`: the wizard step
 * machine hands this kit the raw value rather than a pre-resolved string, and no `translate`
 * reaches this layer. `stepText` shows the finished string when it has one and falls back to
 * the raw key otherwise, matching the test kit's approach in `@ez-kit/form-react`.
 */
function stepText(text: WizardStep['title']): string | undefined {
	if (text === undefined) return undefined
	return typeof text === 'string' ? text : text.key
}

/** Tabs keys are strings; step identity is its `index`. */
function stepKey(index: number): string {
	return String(index)
}

export function Wizard({
	steps,
	currentIndex,
	canGoBack,
	canGoNext,
	isLastStep,
	goNext,
	goBack,
	submitting,
	children,
}: WizardRenderProps): ReactNode {
	const percent = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 100
	const currentStep = steps.find((step) => step.index === currentIndex)

	return (
		<div
			data-slot='wizard'
			className='flex flex-col gap-6'
		>
			<div
				data-slot='wizard-header'
				className='flex flex-col gap-3'
			>
				<ProgressBar
					aria-label='Form progress'
					size='sm'
					value={percent}
				>
					<ProgressBar.Track>
						<ProgressBar.Fill />
					</ProgressBar.Track>
				</ProgressBar>

				<Tabs
					selectedKey={stepKey(currentIndex)}
					onSelectionChange={(key) => {
						const target = steps.find((step) => stepKey(step.index) === key)
						target?.goTo()
					}}
				>
					<Tabs.ListContainer>
						<Tabs.List aria-label='Form steps'>
							{steps.map((step) => (
								<Tabs.Tab
									key={step.index}
									data-slot='wizard-step'
									data-status={step.status}
									data-invalid={step.invalid || undefined}
									id={stepKey(step.index)}
									isDisabled={step.disabled}
								>
									{stepText(step.title) ?? `Step ${String(step.index + 1)}`}
									<Tabs.Indicator />
								</Tabs.Tab>
							))}
						</Tabs.List>
					</Tabs.ListContainer>
					{currentStep !== undefined && (
						<Tabs.Panel
							data-slot='wizard-body'
							id={stepKey(currentStep.index)}
						>
							{children}
						</Tabs.Panel>
					)}
				</Tabs>
			</div>

			<div
				data-slot='wizard-nav'
				className='flex items-center justify-between gap-2'
			>
				<HeroButton
					data-slot='wizard-back'
					type='button'
					variant='secondary'
					isDisabled={!canGoBack || submitting}
					onPress={goBack}
				>
					Back
				</HeroButton>
				<HeroButton
					data-slot='wizard-next'
					type='button'
					variant='primary'
					isDisabled={!canGoNext || submitting}
					onPress={goNext}
				>
					{isLastStep ? 'Review' : 'Next'}
				</HeroButton>
			</div>
		</div>
	)
}
