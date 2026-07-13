'use client'

import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'

import { FRAME_HEIGHT, FRAME_READY, FRAME_THEME, isFrameMessage } from '@/lib/frame-messages'

import type { ReactNode } from 'react'

const MIN_HEIGHT_PX = 200

export type ExampleFrameProps = {
	kit: 'shadcn' | 'heroui'
	slug: string
	action?: ReactNode
}

export function ExampleFrame({ kit, slug, action }: ExampleFrameProps) {
	const { resolvedTheme } = useTheme()
	const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
	const containerRef = useRef<HTMLDivElement>(null)
	const iframeRef = useRef<HTMLIFrameElement>(null)
	const [visible, setVisible] = useState(false)
	const [ready, setReady] = useState(false)
	const [height, setHeight] = useState(MIN_HEIGHT_PX)

	// Lazy: only set src once the container scrolls into view.
	useEffect(() => {
		const el = containerRef.current
		if (!el || visible) return
		const io = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting)) {
				setVisible(true)
				io.disconnect()
			}
		})
		io.observe(el)
		return () => {
			io.disconnect()
		}
	}, [visible])

	// Receive height + ready from the child.
	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return
			if (event.source !== iframeRef.current?.contentWindow) return
			if (!isFrameMessage(event.data)) return
			if (event.data.type === FRAME_HEIGHT) setHeight(Math.max(MIN_HEIGHT_PX, event.data.height))
			if (event.data.type === FRAME_READY) setReady(true)
		}
		window.addEventListener('message', onMessage)
		return () => {
			window.removeEventListener('message', onMessage)
		}
	}, [])

	// Push theme changes once the child is ready.
	useEffect(() => {
		if (!ready) return
		iframeRef.current?.contentWindow?.postMessage({ type: FRAME_THEME, theme }, window.location.origin)
	}, [ready, theme])

	// Freeze the theme into `src` the moment the iframe first becomes visible: `src` must
	// never change again on subsequent theme toggles, or the browser navigates/reloads the
	// iframe (destroying grid state — sort/selection/expansion/scroll). Any theme change
	// after that point travels exclusively through the ready-gated FRAME_THEME postMessage
	// effect above, which also corrects the child if this frozen value was stale (e.g.
	// `resolvedTheme` resolved after first mount).
	const frozenThemeRef = useRef<typeof theme | null>(null)
	if (visible && frozenThemeRef.current === null) {
		frozenThemeRef.current = theme
	}
	const initialTheme = frozenThemeRef.current ?? theme
	const src = visible ? `/examples/${kit}/${slug}?theme=${initialTheme}` : undefined

	return (
		<div
			ref={containerRef}
			className='relative'
		>
			{action ? <div className='absolute right-2 top-2 z-10'>{action}</div> : null}
			<iframe
				ref={iframeRef}
				src={src}
				title={`${kit} example: ${slug}`}
				loading='lazy'
				style={{ width: '100%', height, border: '0', display: 'block' }}
			/>
		</div>
	)
}
