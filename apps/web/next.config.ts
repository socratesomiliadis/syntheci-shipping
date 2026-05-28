import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: join(process.cwd(), "../.."),
  transpilePackages: ["@syntheci/ai", "@syntheci/db", "@syntheci/shared"],
};

export default nextConfig;
