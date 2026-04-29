import { DocsLayout } from 'fumadocs-ui/layouts/docs'

import { source } from '../../lib/source'
import { baseOptions } from '../../lib/layout.shared'

import type { ReactNode } from 'react'

type DocsGroupLayoutProps = {
	children: ReactNode
}

export default function DocsGroupLayout({ children }: DocsGroupLayoutProps) {
	return (
		<DocsLayout
			tree={source.pageTree}
			{...baseOptions()}
		>
			{children}
		</DocsLayout>
	)
}
