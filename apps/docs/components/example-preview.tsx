import { ExampleCard, ExampleShell } from '@/components/example-card'
import { SourcePanel } from '@/components/source-panel'

import type { ExampleFile } from '@/components/example-file'
import type { ReactNode } from 'react'

export type ExamplePreviewProps = {
	/** The rendered example itself — a component instance or an `<ExampleFrame />`. */
	view: ReactNode
	/** Every file the example is built from, entry first, already display-ready. */
	files: readonly ExampleFile[]
	/** Optional row above the card — a title caption or the flavor tabs. */
	header?: ReactNode
}

/**
 * The one wrapper every docs example is rendered through: optional header, the live
 * view, and the source panel below it.
 */
export function ExamplePreview({ view, files, header }: ExamplePreviewProps) {
	return (
		<ExampleShell>
			{header}
			<ExampleCard
				view={view}
				source={<SourcePanel files={files} />}
			/>
		</ExampleShell>
	)
}
