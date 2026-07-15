import { ExampleCard, ExampleShell } from '@/components/example-card'
import { DEFAULT_EXAMPLE_LANGUAGE, SourcePanel } from '@/components/source-panel'

import type { ReactNode } from 'react'

export type ExamplePreviewProps = {
	/** The rendered example itself — a component instance or an `<ExampleFrame />`. */
	view: ReactNode
	/** Example source, already in the exact form it should be shown and copied in. */
	source: string
	/** Syntax-highlighting language for the source panel. Defaults to tsx. */
	language?: string
	/** Optional row above the card — a title caption or the flavor tabs. */
	header?: ReactNode
}

/**
 * The one wrapper every docs example is rendered through: optional header, the live
 * view, and the source panel below it.
 */
export function ExamplePreview({ view, source, language = DEFAULT_EXAMPLE_LANGUAGE, header }: ExamplePreviewProps) {
	return (
		<ExampleShell>
			{header}
			<ExampleCard
				view={view}
				source={
					<SourcePanel
						source={source}
						language={language}
					/>
				}
			/>
		</ExampleShell>
	)
}
