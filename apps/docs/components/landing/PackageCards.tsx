import Link from 'next/link'

const PRODUCTS = [
	{
		number: '01',
		name: 'State',
		description: 'Create scoped stores and keep application state close to where it belongs.',
		href: '/docs/zu-store',
		tag: 'ZUSTAND + VALTIO',
	},
	{
		number: '02',
		name: 'Data fetching',
		description: 'Handle query loading and error states with a declarative React API.',
		href: '/docs/query-react',
		tag: 'TANSTACK QUERY',
	},
	{
		number: '03',
		name: 'Styling',
		description: 'Compose Tailwind classes and variants with a small, typed API.',
		href: '/docs/twc',
		tag: 'TAILWIND CSS',
	},
]

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
						<Link
							key={product.name}
							href={product.href}
							className='group flex min-h-52 flex-col rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-violet-500'
						>
							<div className='flex justify-between text-xs font-semibold tracking-wider text-violet-700 dark:text-violet-400'>
								<span>{product.tag}</span>
								<span className='text-zinc-400'>{product.number}</span>
							</div>
							<h3 className='mt-6 text-xl font-semibold tracking-tight text-zinc-950 dark:text-white'>
								{product.name}
							</h3>
							<p className='mt-2 flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400'>{product.description}</p>
							<span className='mt-5 text-sm font-semibold text-violet-700 group-hover:underline dark:text-violet-400'>
								Explore <span aria-hidden='true'>→</span>
							</span>
						</Link>
					))}
				</div>
			</div>
		</section>
	)
}
