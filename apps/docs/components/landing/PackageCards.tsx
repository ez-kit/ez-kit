'use client'

import { useState } from 'react'

import { GlowCard } from '@/components/ui/glow-card'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

const PACKAGES = [
	{
		name: 'zu-store',
		full: '@ez-kit/zu-store',
		desc: 'Zustand context store factory — typed, scoped state in one call.',
	},
	{
		name: 'data-grid-core',
		full: '@ez-kit/data-grid-core',
		desc: 'Headless data grid built on TanStack Table. Framework-agnostic.',
	},
	{
		name: 'data-grid-react',
		full: '@ez-kit/data-grid-react',
		desc: 'React adapter for data-grid-core. Bring your own UI kit.',
	},
	{
		name: 'data-grid-shadcn',
		full: '@ez-kit/data-grid-shadcn',
		desc: 'Data grid with shadcn/ui components pre-wired and ready.',
	},
	{
		name: 'data-grid-heroui',
		full: '@ez-kit/data-grid-heroui',
		desc: 'Data grid with HeroUI components pre-wired and ready.',
	},
]

export function PackageCards() {
	return (
		<section className='py-20 px-6'>
			<div className='max-w-[1040px] mx-auto'>
				<ScrollReveal>
					<h2 className='text-2xl font-bold tracking-[-0.03em] mb-1.5'>Everything you need</h2>
					<p className='text-gray-500 dark:text-gray-400 mb-10 text-[0.95rem]'>Five focused packages, zero bloat.</p>
				</ScrollReveal>

				<div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
					{PACKAGES.map((pkg, i) => (
						<ScrollReveal
							key={pkg.name}
							delay={i * 0.06}
						>
							<PackageCard {...pkg} />
						</ScrollReveal>
					))}
				</div>
			</div>
		</section>
	)
}

function PackageCard({ name, full, desc }: { name: string; full: string; desc: string }) {
	const [copied, setCopied] = useState(false)
	const installCmd = `npm i ${full}`

	function handleCopy() {
		void navigator.clipboard.writeText(installCmd)
		setCopied(true)
		setTimeout(() => {
			setCopied(false)
		}, 1500)
	}

	return (
		<GlowCard className='flex flex-col gap-3 p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 h-full'>
			<div className='flex items-center gap-2'>
				<span
					className='w-2 h-2 rounded-full flex-shrink-0'
					style={{ background: 'var(--mint)' }}
				/>
				<span className='text-sm font-semibold text-gray-900 dark:text-white'>{name}</span>
			</div>

			<p className='text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1'>{desc}</p>

			<button
				type='button'
				onClick={handleCopy}
				className='flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left group hover:border-[color:var(--mint-border)] transition-colors cursor-pointer w-full'
			>
				<code className='text-[0.75rem] text-gray-600 dark:text-gray-400 font-mono truncate'>{installCmd}</code>
				<span className='text-[0.72rem] text-gray-400 group-hover:text-[color:var(--mint)] transition-colors flex-shrink-0'>
					{copied ? '✓' : 'copy'}
				</span>
			</button>
		</GlowCard>
	)
}
