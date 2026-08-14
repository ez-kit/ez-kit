import path from 'node:path'

import { DEFAULT_EXAMPLE_LANGUAGE } from '@/components/example-file'
import { collectExampleFiles } from '@/components/example-files'
import { ExamplePreview } from '@/components/example-preview'

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
	const [entryFile, ...dependencies] = await collectExampleFiles(
		path.join(EXAMPLES_ROOT, `${examplePath}.tsx`),
		EXAMPLES_ROOT,
	)

	if (!entryFile) throw new Error(`LivePreview: no source for example "${examplePath}"`)

	return (
		<ExamplePreview
			view={<Component />}
			files={[{ ...entryFile, language: lang }, ...dependencies]}
			header={title ? <span className='text-xs text-fd-muted-foreground'>{title}</span> : null}
		/>
	)
}
