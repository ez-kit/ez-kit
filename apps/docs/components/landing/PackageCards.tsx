import Link from 'next/link'

import { UtilityArt } from './UtilityArt'

const PRODUCTS = [
	{
		number: '01',
		art: 'state',
		name: 'State',
		description: 'Create scoped stores and keep application state close to where it belongs.',
		links: [
			{ label: 'Zustand', href: '/docs/zu-store' },
			{ label: 'Valtio', href: '/docs/va-store' },
		],
		tag: 'ZUSTAND + VALTIO',
	},
	{
		number: '02',
		art: 'query',
		name: 'Data fetching',
		description: 'Handle query loading and error states with a declarative React API.',
		links: [{ label: 'Explore data fetching', href: '/docs/query-react' }],
		tag: 'TANSTACK QUERY',
	},
	{
		number: '03',
		art: 'styling',
		name: 'Styling',
		description: 'Compose Tailwind classes and variants with a small, typed API.',
		links: [{ label: 'Explore styling', href: '/docs/twc' }],
		tag: 'TAILWIND CSS',
	},
] as const

export function PackageCards() {
	return (
		<section
			id='explore'
			className='scroll-mt-20 px-6 py-20 sm:py-28'
		>
			<div className='mx-auto max-w-[1200px]'>
				<p className='text-xs font-bold tracking-[0.16em] text-violet-700 uppercase dark:text-violet-400'>
					More from ez-kit
				</p>
				<div className='mt-4 flex flex-wrap items-end justify-between gap-4'>
					<h2 className='max-w-2xl text-3xl font-bold tracking-[-0.04em] text-zinc-950 sm:text-4xl dark:text-white'>
						Small tools. A smoother workflow.
					</h2>
					<p className='max-w-xs text-sm leading-6 text-zinc-500 dark:text-zinc-400'>
						State, data fetching, and styling utilities that fit into the stack you already use.
					</p>
				</div>
				<div className='mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
					{PRODUCTS.map((product) => (
						<article
							key={product.name}
							className='group flex min-h-52 flex-col rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-400 hover:shadow-xl hover:shadow-violet-950/10 motion-reduce:transform-none motion-reduce:transition-none dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-500'
						>
							<div className='flex justify-between text-xs font-semibold tracking-wider text-violet-700 dark:text-violet-400'>
								<span>{product.tag}</span>
								<span
									aria-hidden='true'
									className='text-zinc-500 dark:text-zinc-400'
								>
									{product.number}
								</span>
							</div>
							<div className='mt-5 overflow-hidden rounded-2xl transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none'>
								<UtilityArt kind={product.art} />
							</div>
							<h3 className='mt-6 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white'>
								{product.name}
							</h3>
							<p className='mt-2 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400'>{product.description}</p>
							<div className='mt-5 flex flex-wrap gap-x-5 gap-y-2'>
								{product.links.map((link) => (
									<Link
										key={link.href}
										href={link.href}
										className='rounded-sm text-sm font-semibold text-violet-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:text-violet-400'
									>
										{link.label} <span aria-hidden='true'>→</span>
									</Link>
								))}
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	)
}
