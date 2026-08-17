/**
 * @fileoverview Pins Next.js tracing to this project when parent directories contain other lockfiles.
 */

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url))
};

export default nextConfig;
