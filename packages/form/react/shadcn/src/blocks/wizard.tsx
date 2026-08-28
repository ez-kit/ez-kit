import { CheckIcon } from 'lucide-react'
import { Fragment } from 'react'

import { Button as ButtonPrimitive } from '@form-shadcn/components/ui/button'
import { Progress } from '@form-shadcn/components/ui/progress'
import { Separator } from '@form-shadcn/components/ui/separator'
import { cn } from '@form-shadcn/lib/utils'

import type { WizardRenderProps, WizardStep } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The shadcn Wizard chrome, assembled from `Progress`, `Separator` and `Button` — neither
 * kit ships a stepper (see `AGENTS.md`/task brief), so this is hand-built in `blocks/` over
 * the vendored, immutable `components/ui/**` primitives, same as every other adapter here.
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

function StepIndicator({ step }: { step: WizardStep }): ReactNode {
	if (step.status === 'complete') {
		return (
			<CheckIcon
				data-slot='wizard-step-check'
				className='size-4'
			/>
		)
	}
	return <span data-slot='wizard-step-number'>{step.index + 1}</span>
}

function StepTrigger({ step }: { step: WizardStep }): ReactNode {
	const title = stepText(step.title)
	return (
		<li
			data-slot='wizard-step'
			data-testid='wizard-step'
			data-status={step.status}
			data-invalid={step.invalid || undefined}
			className='flex flex-1 items-center gap-2'
		>
			<button
				data-slot='wizard-step-trigger'
				type='button'
				disabled={step.disabled}
				onClick={step.goTo}
				aria-current={step.status === 'current' ? 'step' : undefined}
				className={cn(
					'flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors',
					'disabled:pointer-events-none disabled:opacity-50',
					'not-disabled:hover:bg-muted not-disabled:hover:text-foreground',
					step.status === 'current' && 'text-foreground',
					step.invalid && 'text-destructive',
				)}
			>
				<span
					data-slot='wizard-step-badge'
					className={cn(
						'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
						step.status === 'complete' && 'border-primary bg-primary text-primary-foreground',
						step.status === 'current' && 'border-primary text-primary',
						step.status === 'upcoming' && 'border-border text-muted-foreground',
						step.invalid && 'border-destructive text-destructive',
					)}
				>
					<StepIndicator step={step} />
				</span>
				{title !== undefined && <span data-slot='wizard-step-title'>{title}</span>}
			</button>
		</li>
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

	return (
		<div
			data-slot='wizard'
			className='flex flex-col gap-6'
		>
			<div
				data-slot='wizard-header'
				className='flex flex-col gap-3'
			>
				<Progress
					data-slot='wizard-progress'
					value={percent}
				/>
				<nav aria-label='Form steps'>
					<ol
						data-slot='wizard-steps'
						className='flex items-center'
					>
						{steps.map((step, index) => (
							<Fragment key={step.index}>
								<StepTrigger step={step} />
								{index < steps.length - 1 && (
									<Separator
										data-slot='wizard-step-separator'
										className='mx-2 w-4 shrink-0'
									/>
								)}
							</Fragment>
						))}
					</ol>
				</nav>
			</div>

			<div data-slot='wizard-body'>{children}</div>

			<div
				data-slot='wizard-nav'
				className='flex items-center justify-between gap-2'
			>
				<ButtonPrimitive
					data-slot='wizard-back'
					type='button'
					variant='outline'
					disabled={!canGoBack || submitting}
					onClick={goBack}
				>
					Back
				</ButtonPrimitive>
				<ButtonPrimitive
					data-slot='wizard-next'
					type='button'
					disabled={!canGoNext || submitting}
					onClick={goNext}
				>
					{isLastStep ? 'Review' : 'Next'}
				</ButtonPrimitive>
			</div>
		</div>
	)
}
