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
 * `WizardStep.title`/`description` are `ReactNode`, already resolved by the adapter — same
 * rule as `FieldRenderProps.label`/`description`. This kit renders what it is given; it never
 * sees a `LocalizedText` or translates anything itself.
 *
 * `data-status`/`data-invalid` on `Tabs.Tab` are CSS/test hooks, not styling by themselves —
 * `stepBadgeClassName`/`stepLabelClassName` below are what actually paint a `complete` step
 * differently from an `upcoming` one and make an `invalid` step visually distinct, the same
 * job the shadcn kit does with `cn(...)` in its own `StepTrigger`.
 */

/** Minimal class joiner — this package ships no `cn`/`tailwind-merge` (see `blocks/layout.tsx`). */
function cx(...classNames: (string | false | undefined)[]) {
	return classNames.filter(Boolean).join(' ')
}

/** Tabs keys are strings; step identity is its `index`. */
function stepKey(index: number): string {
	return String(index)
}

function stepBadgeClassName(step: WizardStep): string {
	return cx(
		'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
		step.status === 'complete' && 'border-accent bg-accent text-accent-foreground',
		step.status === 'current' && 'border-accent text-accent',
		step.status === 'upcoming' && 'border-border text-muted',
		step.invalid && 'border-danger text-danger',
	)
}

function stepLabelClassName(step: WizardStep): string {
	return cx(
		'text-sm font-medium text-muted',
		step.status === 'current' && 'text-foreground',
		step.invalid && 'text-danger',
	)
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
								// HeroUI's `Tabs.Tab` sets its own `data-slot="tabs-tab"` after spreading incoming
								// props, so a `data-slot` passed here never survives — `data-wizard-slot` is a name
								// HeroUI does not claim.
								<Tabs.Tab
									key={step.index}
									data-wizard-slot='step'
									data-status={step.status}
									data-invalid={step.invalid || undefined}
									id={stepKey(step.index)}
									isDisabled={step.disabled}
									className='flex flex-col items-start gap-0.5'
								>
									<span className='flex items-center gap-2'>
										<span
											data-slot='wizard-step-badge'
											className={stepBadgeClassName(step)}
										>
											{step.status === 'complete' ? '✓' : step.index + 1}
										</span>
										<span
											data-slot='wizard-step-title'
											className={stepLabelClassName(step)}
										>
											{step.title ?? `Step ${String(step.index + 1)}`}
										</span>
									</span>
									{step.description !== undefined && (
										<span
											data-slot='wizard-step-description'
											className='text-xs text-muted'
										>
											{step.description}
										</span>
									)}
									<Tabs.Indicator />
								</Tabs.Tab>
							))}
						</Tabs.List>
					</Tabs.ListContainer>
					{currentStep !== undefined && (
						// Same clobbering as `Tabs.Tab` above — HeroUI's `Tabs.Panel` sets its own
						// `data-slot="tabs-panel"`, so `data-wizard-slot` is the hook that actually lands.
						<Tabs.Panel
							data-wizard-slot='body'
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
