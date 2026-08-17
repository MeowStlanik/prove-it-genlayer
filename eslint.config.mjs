import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/",
    "out/",
    "dist/",
    "coverage/",
    "artifacts/",
    "outputs/",
    "work/",
    ".pytest_cache/",
    ".test-venv/",
    "next-env.d.ts",
  ]),
]);
