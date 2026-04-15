import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import("jest").Config} */
const config = {
  coverageProvider: "v8",
  testEnvironment: "node",
  testMatch: ["**/tests/unit/**/*.test.[jt]s?(x)"],
  modulePaths: ["<rootDir>"],
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "!src/lib/**/*.d.ts",
    // Infra / metrics: covered by integration & load tests, not Jest unit scope
    "!src/lib/redis.ts",
    "!src/lib/prometheus.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "html", "lcov"],
};

export default createJestConfig(config);
