import { FormOptionSources } from '@ez-kit/form-react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Form } from './form'

import type { OptionSourceRegistry } from '@ez-kit/form-react'

/**
 * A named option source, end to end through this kit.
 *
 * The binding layer's own tests already cover the parameter plumbing; what is this kit's to
 * prove is only that a source's `loading` lands on the same skeleton an app gets from
 * `loading={query.isPending}`, and that its options render once it clears.
 */

type Values = { city: string }

/** The marker both kits' skeletons carry, so the same assertion works either side. */
const SKELETON = '[data-form-skeleton]'

const CITIES: readonly { label: string; value: string }[] = [
	{ label: 'Berlin', value: 'ber' },
	{ label: 'Munich', value: 'muc' },
]

const PENDING: OptionSourceRegistry = { cities: () => ({ options: [], loading: true }) }
const SETTLED: OptionSourceRegistry = { cities: () => ({ options: CITIES, loading: false }) }

function SourcedCase({ sources }: { sources: OptionSourceRegistry }) {
	return (
		<FormOptionSources value={sources}>
			<Form defaultValues={{ city: '' } satisfies Values}>
				{(form) => (
					<form.SelectField
						name='city'
						label='City'
						placeholder='Pick a city'
						optionsFrom='cities'
					/>
				)}
			</Form>
		</FormOptionSources>
	)
}

describe('@ez-kit/form-shadcn option sources', () => {
	it("draws the source's pending state as the loading skeleton", () => {
		const { container } = render(<SourcedCase sources={PENDING} />)

		expect(container.querySelectorAll(SKELETON).length).toBeGreaterThan(0)
	})

	it('renders the options the source returned once it has settled', () => {
		const { container } = render(<SourcedCase sources={SETTLED} />)

		expect(container.querySelectorAll(SKELETON)).toHaveLength(0)
		expect(screen.getByLabelText('City')).toBeInTheDocument()
	})
})
