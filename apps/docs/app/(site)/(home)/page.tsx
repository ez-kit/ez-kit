import Link from 'next/link'

import { FormShowcase } from '@/components/landing/FormShowcase'
import { Hero } from '@/components/landing/Hero'
import { PackageCards } from '@/components/landing/PackageCards'

export default function LandingPage() {
	return (
		<div>
			<Hero />
			<FormShowcase />
			<PackageCards />
			<section className='border-t border-zinc-200 bg-zinc-50 px-6 py-20 dark:border-zinc-800 dark:bg-zinc-900/30'>
				<div className='mx-auto grid max-w-[1200px] gap-10 md:grid-cols-2'>
					<div>
						<p className='text-xs font-bold tracking-[0.16em] text-violet-700 uppercase dark:text-violet-400'>
							Designed to fit
						</p>
						<h2 className='mt-4 max-w-md text-3xl font-bold tracking-[-0.04em] sm:text-4xl'>
							Your stack, your interface.
						</h2>
						<p className='mt-4 max-w-md leading-7 text-zinc-600 dark:text-zinc-400'>
							Keep the behavior you need and choose how it looks. Start with a ready-made integration or compose your
							own.
						</p>
					</div>
					<div className='grid gap-3'>
						{[
							['01', 'Shared behavior', 'Build on the same underlying logic.'],
							['02', 'React integration', 'Connect it to your application.'],
							['03', 'Your UI kit', 'Use a supported kit or bring your own.'],
						].map(([number, title, description]) => (
							<div
								key={number}
								className='flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950'
							>
								<span className='font-mono text-sm text-violet-600 dark:text-violet-400'>{number}</span>
								<div>
									<h3 className='font-semibold'>{title}</h3>
									<p className='mt-1 text-sm text-zinc-600 dark:text-zinc-400'>{description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
			<section className='px-6 py-20 text-center'>
				<h2 className='text-3xl font-bold tracking-tight'>Ready to build?</h2>
				<p className='mt-3 text-zinc-600 dark:text-zinc-400'>Find the right starting point for your project.</p>
				<div className='mt-7 flex justify-center gap-3'>
					<Link
						href='/docs'
						className='rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800'
					>
						Read the docs →
					</Link>
					<Link
						href='https://github.com/ez-kit/ez-kit'
						className='rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold dark:border-zinc-700'
					>
						GitHub ↗
					</Link>
				</div>
			</section>
		</div>
	)
}
