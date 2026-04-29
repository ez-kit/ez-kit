'use client'

import { motion } from 'framer-motion'

import type { CSSProperties } from 'react'

type SplitTextProps = {
	text: string
	className?: string
	delay?: number
	style?: CSSProperties
}

export function SplitText({ text, className, delay = 0, style }: SplitTextProps) {
	const words = text.split(' ')

	return (
		<span className={className} style={style} aria-label={text}>
			{words.map((word, i) => (
				<motion.span
					key={`${word}-${String(i)}`}
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						delay: delay + i * 0.08,
						ease: [0.16, 1, 0.3, 1],
					}}
					style={{ display: 'inline-block', marginRight: '0.22em' }}
				>
					{word}
				</motion.span>
			))}
		</span>
	)
}
