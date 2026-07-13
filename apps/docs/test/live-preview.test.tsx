/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('fumadocs-ui/components/dynamic-codeblock', () => ({
	DynamicCodeBlock: ({ code, lang }: { code: string; lang: string }) => (
		<pre
			data-testid='mock-dyncode'
			data-lang={lang}
		>
			{code}
		</pre>
	),
}))

vi.mock('node:fs/promises', () => {
	const readFile = vi.fn().mockResolvedValue('export default function Example() {\n\treturn <div>hi</div>\n}\n')
	return { default: { readFile }, readFile }
})

vi.mock('@/shared/examples/zu-store/counter', () => ({
	default: () => <div data-testid='live-example'>live</div>,
}))

import { LivePreview } from '../components/live-preview'

describe('<LivePreview />', () => {
	it('renders the live example stacked above the source panel (no Preview/Code tabs)', async () => {
		render(await LivePreview({ path: 'zu-store/counter', title: 'Counter' }))

		// live component is mounted
		expect(screen.getByTestId('live-example')).toBeInTheDocument()
		// source is shown via the reused SourcePanel (Copy affordance)
		expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
		expect(screen.getByTestId('mock-dyncode').textContent).toContain('export default function Example')
		// stacked layout, not the old tabbed one
		expect(screen.queryAllByRole('tab')).toHaveLength(0)
	})

	it('passes the requested language to the source panel', async () => {
		render(await LivePreview({ path: 'zu-store/counter', lang: 'ts' }))
		expect(screen.getByTestId('mock-dyncode')).toHaveAttribute('data-lang', 'ts')
	})
})
