import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * `useLayoutEffect` has no effect during SSR — there is no layout to read — and React logs a
 * warning when it is called there. Swapping in `useEffect` keeps the warning away without
 * changing client behaviour, since neither runs on the server.
 *
 * Use it only for work that must land before paint (measuring the DOM, writing a position that
 * would otherwise be visibly wrong for one frame). Plain `useEffect` stays the default.
 */
export const useSafeLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect
