/**
 * @fileoverview Pins Next.js tracing to this project when parent directories contain other lockfiles.
 */

import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url))
};

export default nextConfig;
