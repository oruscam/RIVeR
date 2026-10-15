import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  // Playwright specs (e2e/) run with `npm run test:e2e`, not Jest.
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};