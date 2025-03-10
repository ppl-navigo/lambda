/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';
import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: ".",
});

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  preset: 'ts-jest',
  coveragePathIgnorePatterns: [
    "/components/ui/",
    "/node_modules",
    "/tests",
    "/.next",
    "/.vercel",
    "/.github",
    "/.vscode",
    "/.git",
    "/public",
    "/cypress",
    "/coverage",
    "/dist",
    "/.swc",
    "/app/.*?/page\\.tsx",
  ],
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
    "^@/(.*)$": "<rootDir>/$1",
    "\\.(css|less|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",
  },
  resolver: "<rootDir>/jest.resolver.js",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
}

export default config
