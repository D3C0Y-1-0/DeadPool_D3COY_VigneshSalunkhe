import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.MIRAGE_API_URL || "http://localhost:8000"}/api/:path*`
      },
      {
        source: "/health",
        destination: `${process.env.MIRAGE_API_URL || "http://localhost:8000"}/health`
      }
    ];
  }
};

export default nextConfig;
