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
	const { type, height, theme } = value as { type?: unknown; height?: unknown; theme?: unknown }
	if (type === FRAME_READY) return true
	if (type === FRAME_HEIGHT) return typeof height === 'number' && Number.isFinite(height)
	if (type === FRAME_THEME) return theme === 'light' || theme === 'dark'
	return false
}
