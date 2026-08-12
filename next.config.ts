import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/test",
        destination: "/test/start.html",
        permanent: false,
      },
      {
        source: "/test/take",
        destination: "/test/take.html",
        permanent: false,
      },
      {
        source: "/results",
        destination: "/results.html",
        permanent: false,
      },
      {
        source: "/admin",
        destination: "/admin/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
