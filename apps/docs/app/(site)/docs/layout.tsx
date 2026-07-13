import { DocsLayout } from 'fumadocs-ui/layouts/docs'

import { baseOptions } from '../../../lib/layout.shared'
import { source } from '../../../lib/source'

import styles from './styles.module.css'

import type { ReactNode } from 'react'

type DocsGroupLayoutProps = {
	children: ReactNode
}

export default function DocsGroupLayout({ children }: DocsGroupLayoutProps) {
	return (
		<DocsLayout
			tree={source.pageTree}
			{...baseOptions()}
			sidebar={{
				className: '',
			}}
			containerProps={{
				className: styles.container,
			}}
		>
			{children}
		</DocsLayout>
	)
}
