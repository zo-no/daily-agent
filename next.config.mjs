/**
 * @fileoverview 将 Next.js 构建追踪范围限定到当前项目根目录。
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd()
};

export default nextConfig;
