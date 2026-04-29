'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

import { BlurText } from '@/components/ui/blur-text'
import { Silk } from '@/components/ui/silk'
import { SplitText } from '@/components/ui/split-text'

const FLOATING_PACKAGES = [
	{ name: '@ez-kit/data-grid-shadcn', delay: 0.38 },
	{ name: '@ez-kit/data-grid-heroui', delay: 0.5 },
	{ name: '@ez-kit/data-grid-react', delay: 0.62 },
	{ name: '@ez-kit/zu-store', delay: 0.74 },
]

export function Hero() {
	return (
		<section
			className='relative flex items-center min-h-screen px-6 overflow-hidden'
			style={{ background: '#060b0a' }}
		>
			<Silk
				className='absolute inset-0 pointer-events-none'
				color='#00e5c3'
				speed={3}
				scale={1.2}
				noiseIntensity={1.2}
				rotation={0}
			/>

			<div className='relative z-10 w-full max-w-[1040px] mx-auto grid md:grid-cols-[1.15fr_0.85fr] gap-12 items-center py-28'>
				{/* Left */}
				<div>
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
						className='inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-black tracking-tight mb-6 select-none'
						style={{
							border: '1.5px solid var(--mint)',
							background: 'var(--mint-dim)',
							color: 'var(--mint)',
						}}
					>
						ez
					</motion.div>

					<h1 className='text-[clamp(2.6rem,6vw,4.2rem)] font-extrabold leading-[1.08] tracking-[-0.04em] mb-5 text-white'>
						<SplitText
							text='Drop-in UI.'
							className='block'
							delay={0.05}
						/>
						<SplitText
							text='Any stack.'
							className='block'
							delay={0.22}
							style={{ color: 'var(--mint)' }}
						/>
					</h1>

					<BlurText
						className='block text-lg leading-relaxed text-white max-w-[420px] mb-8'
						text='Framework-agnostic, UI-kit-agnostic packages. Plug in once, works everywhere.'
						delay={0.52}
					/>

					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.78, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
						className='flex gap-3 flex-wrap'
					>
						<Link
							href='/docs'
							className='inline-flex items-center px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-85 transition-opacity'
							style={{
								background: 'var(--mint)',
								color: '#041009',
							}}
						>
							Get started
						</Link>
						<Link
							href='https://www.npmjs.com/search?q=%40ez-kit'
							target='_blank'
							rel='noreferrer'
							className='inline-flex items-center px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 font-semibold text-sm hover:border-[color:var(--mint)] hover:text-[color:var(--mint)] transition-colors'
						>
							npm scope ↗
						</Link>
					</motion.div>
				</div>

				{/* Right — floating package cards + logo placeholder */}
				<div className='hidden md:flex flex-col gap-3 items-start'>
					{FLOATING_PACKAGES.map((pkg) => (
						<motion.div
							key={pkg.name}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{
								delay: pkg.delay,
								duration: 0.55,
								ease: [0.16, 1, 0.3, 1],
							}}
							whileHover={{
								borderColor: 'var(--mint-border)',
								boxShadow: '0 0 0 1px var(--mint-border), 0 4px 20px var(--mint-glow)',
							}}
							className='flex items-center gap-2.5 px-4 py-3 rounded-xl border border-white/10 backdrop-blur-sm'
							style={{ background: 'rgba(255,255,255,0.04)' }}
						>
							<span
								className='w-2 h-2 rounded-full flex-shrink-0'
								style={{ background: 'var(--mint)' }}
							/>
							<span className='font-mono text-[0.8rem] text-white'>{pkg.name}</span>
						</motion.div>
					))}

					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.88, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
						className='mt-5 w-16 h-16 rounded-2xl flex items-center justify-center text-xs font-mono select-none'
						style={{
							border: '2px dashed var(--mint-border)',
							color: 'rgba(0, 229, 195, 0.35)',
						}}
					>
						logo
					</motion.div>
				</div>
			</div>
		</section>
	)
}
