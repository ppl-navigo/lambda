import { Config } from "jest"

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
      },
    ],
    "^.+\\.(js|jsx|mjs|cjs)$": "babel-jest", // Use Babel for JS/JSX
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/(?!(lucide-react)/)"],
  moduleNameMapper: {
    "^@/components/ui/input$": "<rootDir>/components/ui/input",
    "^@/components/ui/textarea$": "<rootDir>/components/ui/textarea",
    "^@/components/ui/button$": "<rootDir>/components/ui/button",
    "^@/components/ui/popover$": "<rootDir>/components/ui/popover",
    "^@/components/ui/calendar$": "<rootDir>/components/ui/calendar",
    "^@/components/ui/dropdown-menu$": "<rootDir>/components/ui/dropdown-menu",
    "^@/components/ui/card$": "<rootDir>/components/ui/card",

    "^@/lib/utils": "<rootDir>/lib/utils",
    "\\.(css|less|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",
  },
  resolver: "<rootDir>/jest.resolver.js",

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
}

export default config
