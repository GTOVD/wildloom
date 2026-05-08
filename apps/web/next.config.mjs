/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: [
    "@wildloom/types",
    "@wildloom/data",
    "@wildloom/combat",
    "@wildloom/species",
    "@wildloom/worldgen",
    "@wildloom/protocol",
    "@wildloom/db",
  ],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
