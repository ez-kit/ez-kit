import Link from 'next/link'

import { MagneticButton } from '@/components/ui/magnetic-button'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

export function LandingCTA() {
	return (
		<section className='py-28 px-6 border-t border-gray-100 dark:border-gray-900'>
			<div className='max-w-[1040px] mx-auto text-center'>
				<ScrollReveal>
					<p className='text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-4'>
						Ready?
					</p>
					<h2 className='text-3xl md:text-[2.8rem] font-extrabold tracking-[-0.04em] mb-10'>Start building.</h2>
				</ScrollReveal>

				<ScrollReveal delay={0.12}>
					<MagneticButton className='inline-block'>
						<Link
							href='/docs'
							className='inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-opacity hover:opacity-90'
							style={{
								background: 'linear-gradient(135deg, var(--mint) 0%, oklch(0.72 0.19 185) 100%)',
								color: '#08251f',
							}}
						>
							Read the docs
							<span aria-hidden='true'>→</span>
						</Link>
					</MagneticButton>
				</ScrollReveal>
			</div>
		</section>
	)
}
