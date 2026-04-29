import { ScrollReveal } from '@/components/ui/scroll-reveal'

const SMALL_CLAIMS = [
	{
		title: 'Typed by default',
		body: 'Strict TypeScript throughout — generics, inference, exact optional properties.',
		icon: '◧',
	},
	{
		title: 'Drop-in',
		body: 'One install, one import. No configuration ceremony.',
		icon: '◉',
	},
	{
		title: 'Production ready',
		body: 'Changesets, CI, bundle budgets. Every release is verified.',
		icon: '◎',
	},
]

export function FeatureClaims() {
	return (
		<section className='py-20 px-6 border-t border-gray-100 dark:border-gray-900'>
			<div className='max-w-[1040px] mx-auto'>
				<ScrollReveal>
					<h2 className='text-2xl font-bold tracking-[-0.03em] mb-8'>Built differently</h2>
				</ScrollReveal>

				<div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
					{/* Big tile — spans 1 col, 2 rows on sm+ */}
					<ScrollReveal className='sm:row-span-2'>
						<div
							className='flex flex-col justify-between h-full min-h-[200px] p-6 rounded-2xl'
							style={{
								border: '1px solid var(--mint-border)',
								background: 'var(--mint-dim)',
							}}
						>
							<span
								className='text-3xl leading-none'
								style={{ color: 'var(--mint)' }}
							>
								◈
							</span>
							<div>
								<h3 className='text-lg font-bold tracking-tight mb-2'>
									Framework agnostic
								</h3>
								<p className='text-sm text-gray-500 dark:text-gray-400 leading-relaxed'>
									React today. Vue, Svelte, or Solid tomorrow. The core is always
									UI-framework-free.
								</p>
							</div>
						</div>
					</ScrollReveal>

					{/* Small tiles */}
					{SMALL_CLAIMS.map((claim, i) => (
						<ScrollReveal
							key={claim.title}
							delay={0.1 + i * 0.07}
						>
							<div className='p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950'>
								<span className='text-xl text-gray-200 dark:text-gray-800 mb-3 block'>
									{claim.icon}
								</span>
								<h3 className='text-base font-semibold tracking-tight mb-1.5'>
									{claim.title}
								</h3>
								<p className='text-sm text-gray-500 dark:text-gray-400 leading-relaxed'>
									{claim.body}
								</p>
							</div>
						</ScrollReveal>
					))}
				</div>
			</div>
		</section>
	)
}
