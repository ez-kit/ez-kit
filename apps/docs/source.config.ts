import { defineConfig, defineDocs } from 'fumadocs-mdx/config'

export const docs: ReturnType<typeof defineDocs> = defineDocs({
	docs: {
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
})

export default defineConfig()
