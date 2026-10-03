/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep Prisma and bcryptjs out of the server bundle; they're loaded from node_modules at runtime.
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
  },
};

export default nextConfig;
