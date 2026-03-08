/** @type {import('next').NextConfig} */
const buildTarget = process.env.NEXT_BUILD_TARGET === "prod" ? "prod" : "dev";

const nextConfig = {
  reactStrictMode: true,
  distDir: buildTarget === "prod" ? ".next-prod" : ".next-dev"
};

module.exports = nextConfig;
