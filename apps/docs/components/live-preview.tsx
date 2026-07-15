import fs from 'node:fs/promises'
import path from 'node:path'

import { ExamplePreview } from '@/components/example-preview'
import { DEFAULT_EXAMPLE_LANGUAGE } from '@/components/source-panel'

import type { ComponentType } from 'react'

type LivePreviewProps = {
	path: string
	lang?: string
	title?: string
}

const EXAMPLES_ROOT = path.join(process.cwd(), 'shared/examples')

export async function LivePreview({ path: examplePath, lang = DEFAULT_EXAMPLE_LANGUAGE, title }: LivePreviewProps) {
	const mod = (await import(`@/shared/examples/${examplePath}`)) as { default: ComponentType }
	const Component = mod.default
	const source = await fs.readFile(path.join(EXAMPLES_ROOT, `${examplePath}.tsx`), 'utf-8')

	return (
		<ExamplePreview
			view={<Component />}
			source={source.trimEnd()}
			language={lang}
			header={title ? <span className='text-xs text-fd-muted-foreground'>{title}</span> : null}
		/>
	)
}
