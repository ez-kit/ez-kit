'use client'

import { useEffect } from 'react'

import { FRAME_HEIGHT, FRAME_READY, FRAME_THEME, isFrameMessage } from '@/lib/frame-messages'

function applyTheme(theme: 'light' | 'dark') {
	const isDark = theme === 'dark'
	document.documentElement.classList.toggle('dark', isDark)
	document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

export function FrameBridge() {
	useEffect(() => {
		const post = (message: { type: string; [key: string]: unknown }) => {
			window.parent.postMessage(message, window.location.origin)
		}

		const reportHeight = () => {
			post({ type: FRAME_HEIGHT, height: document.body.scrollHeight })
		}

		const observer = new ResizeObserver(reportHeight)
		observer.observe(document.body)

		const onMessage = (event: MessageEvent) => {
			if (event.origin !== window.location.origin) return
			if (event.source !== window.parent) return
			if (!isFrameMessage(event.data)) return
			if (event.data.type === FRAME_THEME) applyTheme(event.data.theme)
		}
		window.addEventListener('message', onMessage)

		post({ type: FRAME_READY })
		reportHeight()

		return () => {
			observer.disconnect()
			window.removeEventListener('message', onMessage)
		}
	}, [])

	return null
}
