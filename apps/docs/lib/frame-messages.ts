export const FRAME_READY = 'ez-frame-ready' as const
export const FRAME_HEIGHT = 'ez-frame-height' as const
export const FRAME_THEME = 'ez-frame-theme' as const

export type FrameTheme = 'light' | 'dark'

export type FrameMessage =
	| { type: typeof FRAME_READY }
	| { type: typeof FRAME_HEIGHT; height: number }
	| { type: typeof FRAME_THEME; theme: FrameTheme }

export function isFrameMessage(value: unknown): value is FrameMessage {
	if (typeof value !== 'object' || value === null) return false
	const type = (value as { type?: unknown }).type
	return type === FRAME_READY || type === FRAME_HEIGHT || type === FRAME_THEME
}
