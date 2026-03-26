import { describe, expect, it } from "vitest"

import { cssVar, cx } from "../src/index"

describe("@ez-kit/styling", () => {
  it("joins class values", () => {
    expect(cx("button", "button-primary")).toBe("button button-primary")
  })

  it("handles objects and nested arrays", () => {
    expect(
      cx("base", ["size-md", false], { active: true, disabled: false }, null),
    ).toBe("base size-md active")
  })

  it("creates normalized css custom property map", () => {
    expect(cssVar("accent-color", "tomato")).toEqual({
      "--accent-color": "tomato",
    })
    expect(cssVar("--radius", "8px")).toEqual({
      "--radius": "8px",
    })
  })
})
