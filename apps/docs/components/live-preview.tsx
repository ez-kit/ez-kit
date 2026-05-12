import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import fs from 'node:fs/promises'
import path from 'node:path'

import { LiveTabs } from './live-tabs'

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
		<LiveTabs
			title={title}
			preview={<Component />}
			code={<DynamicCodeBlock lang={lang} code={source.trimEnd()} />}
		/>
	)
}
