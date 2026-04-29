'use client'

import { motion } from 'framer-motion'

type BlurTextProps = {
	text: string
	className?: string
	delay?: number
}

export function BlurText({ text, className, delay = 0.3 }: BlurTextProps) {
	return (
		<motion.span
			className={className}
			initial={{ opacity: 0, filter: 'blur(8px)' }}
			animate={{ opacity: 1, filter: 'blur(0px)' }}
			transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
		>
			{text}
		</motion.span>
	)
}
