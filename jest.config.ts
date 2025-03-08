/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type {Config} from 'jest';
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
  transform: {
    "^.+\\.tsx?$": ['ts-jest', { tsconfig: "tsconfig.jest.json" }]
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
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
    "/.swc"
  ]
};

export default createJestConfig(config);
