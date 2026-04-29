import { RootProvider } from 'fumadocs-ui/provider/next'
import { Inter } from 'next/font/google'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

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
			className={inter.className}
			suppressHydrationWarning
		>
			<body>
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	)
}
