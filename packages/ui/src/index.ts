export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error("min must be less than or equal to max")
  }

  return Math.min(Math.max(value, min), max)
}

export function toPx(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value
}

export function isClientEnvironment(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined"
}
