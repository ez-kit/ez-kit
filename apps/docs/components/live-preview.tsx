import fs from 'node:fs/promises'
import path from 'node:path'

import { ExampleCard, ExampleShell } from './example-card'
import { SourcePanel } from './source-panel'

import type { ComponentType } from 'react'

type LivePreviewProps = {
	path: string
	lang?: string
	title?: string
}

const EXAMPLES_ROOT = path.join(process.cwd(), 'shared/examples')

export async function LivePreview({ path: examplePath, lang = 'tsx', title }: LivePreviewProps) {
	const mod = (await import(`@/shared/examples/${examplePath}`)) as { default: ComponentType }
	const Component = mod.default
	const source = await fs.readFile(path.join(EXAMPLES_ROOT, `${examplePath}.tsx`), 'utf-8')

	return (
		<ExampleShell>
			{title ? <span className='text-xs text-fd-muted-foreground'>{title}</span> : null}
			<ExampleCard
				view={<Component />}
				source={
					<SourcePanel
						source={source.trimEnd()}
						language={lang}
					/>
				}
			/>
		</ExampleShell>
	)
}
