import { ScrollReveal } from '@/components/ui/scroll-reveal'

const FRAMEWORKS: Array<{ name: string; status: 'active' | 'soon' }> = [
	{ name: 'React', status: 'active' },
	{ name: 'Vue', status: 'soon' },
	{ name: 'Svelte', status: 'soon' },
	{ name: 'Solid', status: 'soon' },
]

const UI_KITS: Array<{ name: string; status: 'active' | 'soon' }> = [
	{ name: 'shadcn/ui', status: 'active' },
	{ name: 'HeroUI', status: 'active' },
	{ name: 'more', status: 'soon' },
]

export function FrameworksRow() {
	return (
		<section className='py-14 px-6 border-t border-gray-100 dark:border-gray-900'>
			<div className='max-w-[1040px] mx-auto'>
				<ScrollReveal>
					<p className='text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-5'>
						Works with your stack
					</p>
				</ScrollReveal>

				<div className='flex flex-col gap-3'>
					<ScrollReveal delay={0.08}>
						<div className='flex items-center gap-2.5 flex-wrap'>
							{FRAMEWORKS.map((fw) => (
								<StackBadge
									key={fw.name}
									{...fw}
								/>
							))}
						</div>
					</ScrollReveal>

					<ScrollReveal delay={0.16}>
						<div className='flex items-center gap-2.5 flex-wrap'>
							{UI_KITS.map((kit) => (
								<StackBadge
									key={kit.name}
									{...kit}
								/>
							))}
						</div>
					</ScrollReveal>
				</div>
			</div>
		</section>
	)
}

function StackBadge({ name, status }: { name: string; status: 'active' | 'soon' }) {
	const isActive = status === 'active'

	return (
		<span
			className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium select-none ${
				isActive
					? 'border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white'
					: 'border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600'
			}`}
		>
			{isActive && (
				<span
					className='w-1.5 h-1.5 rounded-full flex-shrink-0'
					style={{ background: 'var(--mint)' }}
				/>
			)}
			{name}
			{!isActive && <span className='text-[0.7rem] opacity-70'>soon</span>}
		</span>
	)
}
