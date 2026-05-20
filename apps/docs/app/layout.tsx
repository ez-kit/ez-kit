import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter, Figtree } from 'next/font/google'

import { cn } from '@/lib/utils'

import './globals.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const figtree = Figtree({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'ez-kit docs',
	description: 'Fumadocs-powered documentation for ez-kit packages.',
}

type RootLayoutProps = {
	children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
	return (
		<html
			lang='en'
			className={cn(inter.className, "font-sans", figtree.variable)}
			suppressHydrationWarning
		>
			<body>
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	)
}
