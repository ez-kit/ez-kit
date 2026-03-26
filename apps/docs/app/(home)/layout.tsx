import { HomeLayout } from 'fumadocs-ui/layouts/home'

import { baseOptions } from '../../lib/layout.shared'

import type { ReactNode } from 'react'

interface HomeGroupLayoutProps {
	children: ReactNode
}

export default function HomeGroupLayout({ children }: HomeGroupLayoutProps) {
	return <HomeLayout {...baseOptions()}>{children}</HomeLayout>
}
