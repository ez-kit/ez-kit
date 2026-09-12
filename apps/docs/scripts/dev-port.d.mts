// `playwright.config.ts` imports this helper, and the docs tsconfig does not type-check
// JavaScript — so the module's shape is declared here.
export declare function worktreeRoot(): string
export declare function deterministicPort(seed?: string): number
export declare function resolvePort(): Promise<number>
