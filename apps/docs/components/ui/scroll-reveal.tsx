'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

interface ScrollRevealProps {
	children: ReactNode
	className?: string
	delay?: number
	y?: number
}

export function ScrollReveal({ children, className, delay = 0, y = 18 }: ScrollRevealProps) {
	const ref = useRef<HTMLDivElement>(null)
	const inView = useInView(ref, { once: true, margin: '-72px 0px' })

	return (
		<motion.div
			ref={ref}
			className={className}
			initial={{ opacity: 0, y }}
			animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
			transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
		>
			{children}
		</motion.div>
	)
}
