/**
 * The UI kits every kit-agnostic spec runs against.
 *
 * Adding a kit is three edits and no test changes: publish the package, add its
 * `app/(embed)/examples/<kit>/[slug]` route, and add its name here. The Playwright config
 * turns this list into one project per kit, so a spec written once is executed once per kit.
 *
 * `test/kits.test.ts` asserts this list and the embed routes on disk name the same kits —
 * a kit with a route but no entry here would simply never be tested, silently.
 */
export const KITS = ['shadcn', 'heroui'] as const

export type Kit = (typeof KITS)[number]
