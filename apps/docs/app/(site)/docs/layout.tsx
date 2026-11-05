import { DocsLayout } from 'fumadocs-ui/layouts/notebook'

import { SidebarHighlight } from '@/components/sidebar-highlight'

import { baseOptions } from '../../../lib/layout.shared'
import { source } from '../../../lib/source'

import styles from './styles.module.css'

import type { ReactNode } from 'react'

type DocsGroupLayoutProps = {
	children: ReactNode
}

export default function DocsGroupLayout({ children }: DocsGroupLayoutProps) {
	const options = baseOptions()
	return (
		<DocsLayout
			tree={source.pageTree}
			{...options}
			nav={{ ...options.nav, mode: 'top' }}
			sidebar={{
				className: '',
			}}
			containerProps={{
				className: styles.container,
			}}
		>
			<SidebarHighlight />
			{children}
		</DocsLayout>
	)
}
