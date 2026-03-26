import { existsSync } from "node:fs"

type GeneratorAnswers = {
  packageName: string
  packageDescription: string
  locationType: "flat" | "grouped"
  groupName?: string
  includeTests: boolean
  packageDir?: string
  packageImportName?: string
  rootRelativePrefix?: string
}

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function validateKebabName(value: string, fieldLabel: string): true | string {
  if (!value) {
    return `${fieldLabel} is required`
  }

  if (!namePattern.test(value)) {
    return `${fieldLabel} must be kebab-case (lowercase letters, numbers, hyphens)`
  }

  return true
}

export default function generator(plop: any): void {
  plop.setGenerator("package", {
    description:
      "Create a new ez-kit package in packages/<name> or packages/<group>/<name>",
    prompts: [
      {
        type: "input",
        name: "packageName",
        message: "Package name (without @ez-kit/):",
        validate: (value: string) => validateKebabName(value, "packageName"),
      },
      {
        type: "input",
        name: "packageDescription",
        message: "Package description:",
        default: "A reusable utility package for ez-kit.",
      },
      {
        type: "list",
        name: "locationType",
        message: "Where should the package be created?",
        choices: [
          { name: "packages/<name>", value: "flat" },
          { name: "packages/<group>/<name>", value: "grouped" },
        ],
      },
      {
        type: "input",
        name: "groupName",
        message: "Group name:",
        when: (answers: GeneratorAnswers) => answers.locationType === "grouped",
        validate: (value: string) => validateKebabName(value, "groupName"),
      },
      {
        type: "confirm",
        name: "includeTests",
        message: "Create a starter test file?",
        default: true,
      },
    ],
    actions: (answers: GeneratorAnswers) => {
      const packageDir =
        answers.locationType === "grouped"
          ? `packages/${answers.groupName}/${answers.packageName}`
          : `packages/${answers.packageName}`

      if (existsSync(packageDir)) {
        throw new Error(`Package path already exists: ${packageDir}`)
      }

      const rootRelativePrefix = answers.locationType === "grouped" ? "../../../" : "../../"

      answers.packageDir = packageDir
      answers.packageImportName = `@ez-kit/${answers.packageName}`
      answers.rootRelativePrefix = rootRelativePrefix

      const actions = [
        {
          type: "add",
          path: "{{packageDir}}/package.json",
          templateFile: "templates/package/package.json.hbs",
        },
        {
          type: "add",
          path: "{{packageDir}}/src/index.ts",
          templateFile: "templates/package/src/index.ts.hbs",
        },
        {
          type: "add",
          path: "{{packageDir}}/tsconfig.json",
          templateFile: "templates/package/tsconfig.json.hbs",
        },
        {
          type: "add",
          path: "{{packageDir}}/vitest.config.ts",
          templateFile: "templates/package/vitest.config.ts.hbs",
        },
        {
          type: "add",
          path: "{{packageDir}}/README.md",
          templateFile: "templates/package/README.md.hbs",
        },
      ]

      if (answers.includeTests) {
        actions.push({
          type: "add",
          path: "{{packageDir}}/src/index.test.ts",
          templateFile: "templates/package/src/index.test.ts.hbs",
        })
      }

      return actions
    },
  })
}
