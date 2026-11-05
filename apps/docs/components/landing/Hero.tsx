import Link from 'next/link'

import { GridPreview } from './GridPreview'
import styles from './landing.module.css'

export function Hero() {
	return (
		<section className='relative overflow-hidden border-b border-violet-100 bg-[#faf9ff] px-6 dark:border-white/10 dark:bg-[#11101a]'>
			<div
				aria-hidden='true'
				className={styles.aurora}
			/>
			<div className='relative mx-auto grid max-w-[1200px] items-center gap-12 py-20 lg:py-24'>
				<div className='max-w-3xl'>
					<p className='mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300'>
						<span className='h-1.5 w-1.5 rounded-full bg-violet-500' /> Open source tools for React
					</p>
					<h1 className='max-w-xl text-5xl font-bold leading-[1.06] tracking-[-0.055em] text-zinc-950 sm:text-6xl dark:text-white'>
						Build more. <span className={styles.techText}>Wire less.</span>
					</h1>
					<p className='mt-6 max-w-lg text-lg leading-8 text-zinc-600 dark:text-zinc-400'>
						Composable data grids, forms, and state tools that fit your React stack — and the UI kit you already use.
					</p>
					<div className='mt-8 flex flex-wrap gap-3'>
						<Link
							href='/docs/data-grid/getting-started'
							className='rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600'
						>
							Get started <span aria-hidden='true'>→</span>
						</Link>
						<a
							href='#explore'
							className='rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-violet-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
						>
							Explore the toolkit
						</a>
					</div>
					<p className='mt-8 text-sm text-zinc-500 dark:text-zinc-400'>
						TypeScript-first{' '}
						<span
							aria-hidden='true'
							className='mx-2 text-violet-400'
						>
							✳
						</span>{' '}
						Built for composition{' '}
						<span
							aria-hidden='true'
							className='mx-2 text-violet-400'
						>
							✳
						</span>{' '}
						Open source
					</p>
				</div>
				<GridPreview />
			</div>
		</section>
	)
}
