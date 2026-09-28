/** @type {import('next').NextConfig} */
const fs = require("fs");

const nextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

if (fs.existsSync("./prisma/build.db")) {
  nextConfig.outputFileTracingIncludes = {
    "/**": ["./prisma/build.db"],
  };
}

module.exports = nextConfig;
